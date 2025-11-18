const crypto = require('crypto');
const config = require('./config');
const { logger, trxSuccessLogger, trxFailedLogger, trxPendingLogger } = require('./logger');
const { notifyTrx, notifyLowBalance } = require('./telegram');
const { postCallback } = require('./callback');

function base64UrlFromBuffer(buf) {
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function buildSignature({ memberId, product, dest, refID, pin, password }) {
  const prefix = config.signPrefix || 'ENGINE';
  const template = `${prefix}|${memberId}|${product}|${dest}|${refID}|${pin}|${password}`;
  const sha = crypto.createHash('sha1').update(template).digest();
  return base64UrlFromBuffer(sha);
}

function generateRefId(prefix = 'AVN') {
  return `${prefix}${Date.now()}`;
}

function classifyTransaction(rawText, httpStatus) {
  const text = String(rawText || '').toLowerCase();

  if (httpStatus !== 200) return 'failed';
  if (/gagal|failed|reject/.test(text)) return 'failed';
  if (/akan diproses|diproses|proses/.test(text) && !/sukses|berhasil/.test(text)) return 'pending';
  if (/sukses|berhasil|ok/.test(text)) return 'success';

  return 'pending'; // default safe choice
}

function parseBalance(rawText) {
  if (!rawText) return null;
  const text = String(rawText);

  // Pola: "Saldo 100.754 - 2.805 = 97.949"
  let match = text.match(/Saldo\s+([\d.,]+)\s*[–\-]\s*([\d.,]+)\s*=\s*([\d.,]+)/i);
  let remainingStr;

  if (match && match[3]) {
    remainingStr = match[3];
  } else {
    // Fallback: "Saldo 97.949"
    const m2 = text.match(/Saldo\s+([\d.,]+)/i);
    if (m2 && m2[1]) {
      remainingStr = m2[1];
    }
  }

  if (!remainingStr) return null;
  const numeric = remainingStr.replace(/[^\d]/g, '');
  if (!numeric) return null;

  const remaining = Number(numeric);
  if (Number.isNaN(remaining)) return null;

  return {
    raw: remainingStr,
    remaining,
  };
}

async function safeFetch(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function sendTransaction({ product, dest, qty, refID, meta }) {
  if (!config.centerUrl) throw new Error('CENTER_URL is not configured');
  if (!config.memberId || !config.pin || !config.password) {
    throw new Error('Member credentials are not fully configured');
  }

  const quantity = qty || 1;
  const effectiveRef = refID || generateRefId();

  const sign = buildSignature({
    memberId: config.memberId,
    product,
    dest,
    refID: effectiveRef,
    pin: config.pin,
    password: config.password,
  });

  const params = new URLSearchParams({
    product: String(product),
    qty: String(quantity),
    dest: String(dest),
    refID: String(effectiveRef),
    memberID: String(config.memberId),
    sign,
  });

  const url = `${config.centerUrl}/trx?${params.toString()}`;

  logger.info('Send to center', {
    url,
    refID: effectiveRef,
    product,
    dest,
    qty: quantity,
  });

  const ipRes = await safeFetch(url, { method: 'GET' }, 20000);
  const rawText = await ipRes.text();

  logger.info('Response from center', {
    statusCode: ipRes.status,
    refID: effectiveRef,
    raw: rawText,
  });

  const balanceInfo = parseBalance(rawText);
  const category = classifyTransaction(rawText, ipRes.status);

  const resultPayload = {
    ok: true,
    statusCode: ipRes.status,
    refID: effectiveRef,
    product,
    dest,
    qty: quantity,
    sign,
    centerUrl: url,
    raw: rawText,
    meta: meta || null,
    balanceInfo,
    category,
    receivedAt: new Date().toISOString(),
  };

  // Structured logs
  if (category === 'success') {
    trxSuccessLogger.info(resultPayload);
  } else if (category === 'failed') {
    trxFailedLogger.info(resultPayload);
  } else {
    trxPendingLogger.info(resultPayload);
  }

  // Telegram notifications (fire-and-forget)
  notifyTrx(category, resultPayload).catch(() => {});

  // Low balance alert
  if (balanceInfo && config.balanceLowLimit > 0 && balanceInfo.remaining <= config.balanceLowLimit) {
    notifyLowBalance(balanceInfo).catch(() => {});
  }

  // Callback to backend/worker
  postCallback('transaction.request', resultPayload).catch(() => {});

  return resultPayload;
}

module.exports = {
  sendTransaction,
  generateRefId,
};
