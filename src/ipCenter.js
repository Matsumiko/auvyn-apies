// src/ipCenter.js
// ===============================================
//  AUVYN APIES • IP Center Bridge
//  - Klasifikasi: success / pending / failed pakai pola R1234.xxx
//  - Baca M-Bal (saldo) dari format "M-Bal : x - y = z" / "M-Bal : x"
//  - PATCH: simpan mapping refID->meta untuk report final
//  - PATCH: sanitize payload sebelum callback
// ===============================================

const crypto = require('crypto');
const config = require('./config');
const { logger, trxSuccessLogger, trxFailedLogger, trxPendingLogger } = require('./logger');
const { notifyTrx, notifyLowBalance } = require('./telegram');
const { postCallback } = require('./callback');
const { savePending } = require('./store'); // PATCH

// ========== UTIL SIGN & REFID ==========

function base64UrlFromBuffer(buf) {
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

// SIGN untuk TRX
function buildSignature({ memberId, product, dest, refID, pin, password }) {
  const prefix = config.signPrefix || 'ENGINE';
  const template = `${prefix}|${memberId}|${product}|${dest}|${refID}|${pin}|${password}`;
  const sha = crypto.createHash('sha1').update(template).digest();
  return base64UrlFromBuffer(sha);
}

// SIGN untuk balance / tiket M-Bal
function buildBalanceSign({ memberId }) {
  const prefix = config.signPrefix || 'ENGINE';
  const template = `${prefix}|${memberId}|${config.pin}|${config.password}`;
  const sha = crypto.createHash('sha1').update(template).digest();
  return base64UrlFromBuffer(sha);
}

function generateRefId(prefix = 'AVN') {
  return `${prefix}${Date.now()}`;
}

// ========== REGEX OTOMAX ==========

const OTOMAX_PATTERNS = [
  {
    code: 'PENDING_AKAN_DIPROSES',
    state: 'PENDING',
    regex: /R(?<trxid>\d+).*\.(?<tujuan>.+) akan diproses/i,
  },
  {
    code: 'PENDING_MENUNGGU_SEBELUMNYA',
    state: 'PENDING',
    regex: /R(?<trxid>\d+).*\.(?<tujuan>.+) @/i,
  },

  {
    code: 'SUKSES',
    state: 'SUCCESS',
    regex: /R(?<trxid>\d+).*\.(?<tujuan>.+) SUKSES.*SN\/Ref:\s*(?<sn>.+)\. M-Bal/i,
  },

  {
    code: 'SUKSES_SUDAH_PERNAH',
    state: 'SUCCESS',
    duplicate: true,
    regex: /R#(?<trxid>\d+).*\.(?<tujuan>.+) sdh.*SN\/Ref:\s*(?<sn>.+)\. M-Bal/i,
  },

  {
    code: 'GAGAL_TUJUAN_SALAH',
    state: 'FAILED',
    regex: /R#(?<trxid>\d+).*\.(?<tujuan>.+) GAGAL\. Nomor tujuan salah\./i,
  },

  {
    code: 'GAGAL_TIMEOUT',
    state: 'FAILED',
    regex: /R(?<trxid>\d+).*\.(?<tujuan>\d+) GAGAL karena timeout/i,
  },

  {
    code: 'GAGAL_SALAH_KODE',
    state: 'FAILED',
    regex: /R(?<trxid>\d+).*\.(?<tujuan>\d+) GAGAL, salah/i,
  },

  {
    code: 'GAGAL_BLACKLIST',
    state: 'FAILED',
    regex: /R#(?<trxid>\d+).*\.(?<tujuan>\d+) sdh pernah jam .*status Nomor Blacklist/i,
  },

  {
    code: 'GAGAL_PRODUK_GANGGUAN',
    state: 'FAILED',
    regex: /R(?<trxid>\d+).*\.(?<tujuan>.+) GAGAL\. Produk sedang gangguan\./i,
  },

  {
    code: 'GAGAL_SALDO_TIDAK_CUKUP',
    state: 'FAILED',
    regex: /R(?<trxid>\d+).*\.(?<tujuan>\d+) GAGAL\. Saldo tidak cukup/i,
  },

  {
    code: 'GAGAL_DIKARENAKAN',
    state: 'FAILED',
    regex: /R(?<trxid>\d+).*\.(?<tujuan>\d+) GAGAL dikarenakan/i,
  },

  {
    code: 'CEK_TIDAK_ADA_DATA',
    state: 'NOT_FOUND',
    regex: /TIDAK ADA transaksi Tujuan "(?<tujuan>\d+)" pada tgl (?<tanggal>\d{2}\/\d{2}\/\d{2})\. Tidak ada data\./i,
  },

  {
    code: 'CEK_SUKSES',
    state: 'SUCCESS',
    regex: /\b(?<kode>[A-Z0-9]+)\s+\S*\.(?<tujuan>\d+)\s+\d{2}:\d{2}\s+Sukses\s+SN:\s*(?<sn>.+)$/im,
  },
];

function parseOtomaxMessage(message) {
  const text = String(message || '').trim();

  for (const pattern of OTOMAX_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      const groups = match.groups || {};
      return {
        state: pattern.state || 'UNKNOWN',
        code: pattern.code || 'UNKNOWN',
        trxid: groups.trxid || null,
        tujuan: groups.tujuan || null,
        sn: groups.sn || null,
        duplicate: !!pattern.duplicate,
        raw: text,
      };
    }
  }

  return {
    state: 'UNKNOWN',
    code: 'UNKNOWN',
    trxid: null,
    tujuan: null,
    sn: null,
    duplicate: false,
    raw: text,
  };
}

// ========== PARSE SALDO (M-Bal / Saldo) ==========

function parseBalance(rawText) {
  if (!rawText) return null;
  const text = String(rawText);

  let remainingStr;

  let m = text.match(/M-Bal\s*:\s*([\d.,]+)\s*[–\-]\s*([\d.,]+)\s*=\s*([\d.,]+)/i);
  if (m && m[3]) {
    remainingStr = m[3];
  } else {
    m = text.match(/M-Bal\s*:\s*([\d.,]+)/i);
    if (m && m[1]) {
      remainingStr = m[1];
    }
  }

  if (!remainingStr) {
    let match = text.match(/Saldo\s+([\d.,]+)\s*[–\-]\s*([\d.,]+)\s*=\s*([\d.,]+)/i);
    if (match && match[3]) {
      remainingStr = match[3];
    } else {
      const m2 = text.match(/Saldo\s+([\d.,]+)/i);
      if (m2 && m2[1]) {
        remainingStr = m2[1];
      }
    }
  }

  if (!remainingStr) return null;

  const numeric = remainingStr.replace(/[^\d]/g, '');
  if (!numeric) return null;

  const remaining = Number(numeric);
  if (!Number.isFinite(remaining)) return null;

  return { raw: remainingStr, remaining };
}

// ========== HTTP HELPER ==========

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

// ========== KLASIFIKASI TRX ==========

function classifyTransaction(rawText, httpStatus) {
  if (httpStatus !== 200) return 'failed';

  const parsed = parseOtomaxMessage(rawText);

  if (parsed && parsed.state) {
    switch (parsed.state) {
      case 'SUCCESS': return 'success';
      case 'FAILED': return 'failed';
      case 'PENDING': return 'pending';
      case 'NOT_FOUND': return 'failed';
      default: break;
    }
  }

  const text = String(rawText || '').toLowerCase();
  if (/gagal|failed|reject/.test(text)) return 'failed';
  if (/akan diproses|menunggu jawaban|sedang diproses|proses/.test(text) && !/sukses|berhasil/.test(text)) {
    return 'pending';
  }
  if (/sukses|berhasil|ok/.test(text)) return 'success';

  return 'pending';
}

// ========== SANITIZER UNTUK CALLBACK KE WORKER ==========

function redactRaw(rawText = '') {
  let t = String(rawText);

  // buang detail HRG / M-Bal / SN
  t = t.replace(/HRG:.*?M-?Bal\s*:\s*.*$/i, '[REDACTED]');
  t = t.replace(/M-?Bal\s*:\s*.*$/i, '[REDACTED]');
  t = t.replace(/SN\/Ref:\s*.*?(?=\.|$)/i, 'SN/Ref: [REDACTED]');

  // buang memberID / sign / url center yang kebawa
  t = t.replace(/memberID=\w+/ig, 'memberID=[REDACTED]');
  t = t.replace(/sign=[^&\s]+/ig, 'sign=[REDACTED]');
  t = t.replace(/https?:\/\/[^\s]+\/trx\?[^\s]+/ig, '[REDACTED_URL]');

  return t.trim();
}

function sanitizeForCallback(fullPayload) {
  if (!fullPayload || typeof fullPayload !== 'object') return fullPayload;

  const safe = {
    ok: fullPayload.ok,
    statusCode: fullPayload.statusCode,
    refID: fullPayload.refID,
    product: fullPayload.product,
    dest: fullPayload.dest,
    qty: fullPayload.qty,
    category: fullPayload.category,
    receivedAt: fullPayload.receivedAt,
    meta: fullPayload.meta || null,

    providerResult: fullPayload.providerResult
      ? {
          state: fullPayload.providerResult.state || null,
          code: fullPayload.providerResult.code || null,
          trxid: fullPayload.providerResult.trxid || null,
          tujuan: fullPayload.providerResult.tujuan || null,
          sn: fullPayload.providerResult.sn ? '[REDACTED]' : null,
          duplicate: !!fullPayload.providerResult.duplicate,
          raw: fullPayload.providerResult.raw
            ? redactRaw(fullPayload.providerResult.raw)
            : null
        }
      : null,

    raw: fullPayload.raw ? redactRaw(fullPayload.raw) : null,
  };
  return safe;
}

// ========== FUNGSI TRX UTAMA ==========

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

  logger.info('Send to center', { url, refID: effectiveRef, product, dest, qty: quantity });

  const ipRes = await safeFetch(url, { method: 'GET' }, 20000);
  const rawText = await ipRes.text();

  logger.info('Response from center', {
    statusCode: ipRes.status,
    refID: effectiveRef,
    raw: rawText,
  });

  const balanceInfo = parseBalance(rawText);
  const providerResult = parseOtomaxMessage(rawText);
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
    providerResult,
    isDuplicate: !!(providerResult && providerResult.duplicate),
    receivedAt: new Date().toISOString(),
  };

  // PATCH: simpan mapping refID -> meta
  savePending(effectiveRef, {
    refID: effectiveRef,
    product,
    dest,
    qty: quantity,
    meta: meta || null,
    firstPayload: resultPayload,
  });

  // Log internal tetap full
  if (category === 'success') trxSuccessLogger.info(resultPayload);
  else if (category === 'failed') trxFailedLogger.info(resultPayload);
  else trxPendingLogger.info(resultPayload);

  notifyTrx(category, resultPayload).catch(() => {});
  if (balanceInfo && config.balanceLowLimit > 0 && balanceInfo.remaining <= config.balanceLowLimit) {
    notifyLowBalance(balanceInfo).catch(() => {});
  }

  // PATCH: callback
  const safeCallbackPayload = sanitizeForCallback(resultPayload);
  postCallback('transaction.request', safeCallbackPayload).catch(() => {});

  return resultPayload;
}

// ========== FUNGSI CEK SALDO (M-Bal) ==========
// 4. Cek M-Bal : balance?memberID=[memberid]
// UPDATE: no sign, tapi tetap kirim pin & password

async function checkBalance({ memberId, meta, pin, password } = {}) {
  if (!config.centerUrl) throw new Error('CENTER_URL is not configured');

  const usedMemberId = memberId || config.memberId;
  const usedPin = pin || config.pin;
  const usedPassword = password || config.password;

  if (!usedMemberId) {
    throw new Error('memberID is required for balance check');
  }
  if (!usedPin || !usedPassword) {
    throw new Error('PIN dan Password wajib diisi untuk balance check tanpa sign');
  }

  const params = new URLSearchParams();
  params.set('memberID', String(usedMemberId));
  params.set('memberid', String(usedMemberId));
  params.set('pin', String(usedPin));
  params.set('password', String(usedPassword));

  const url = `${config.centerUrl}/balance?${params.toString()}`;

  logger.info('Check balance to center (no sign, with pin/password)', {
    url,
    memberID: usedMemberId,
  });

  const ipRes = await safeFetch(url, { method: 'GET' }, 20000);
  const rawText = await ipRes.text();

  logger.info('Response balance from center', {
    statusCode: ipRes.status,
    memberID: usedMemberId,
    raw: rawText,
  });

  const balanceInfo = parseBalance(rawText);
  const providerResult = parseOtomaxMessage(rawText);

  const resultPayload = {
    ok: ipRes.ok,
    statusCode: ipRes.status,
    memberID: usedMemberId,
    sign: null,
    centerUrl: url,
    raw: rawText,
    balanceInfo,
    providerResult,
    meta: meta || null,
    receivedAt: new Date().toISOString(),
  };

  const safeCallbackPayload = sanitizeForCallback(resultPayload);
  postCallback('balance.check', safeCallbackPayload).catch(() => {});

  if (balanceInfo && config.balanceLowLimit > 0 && balanceInfo.remaining <= config.balanceLowLimit) {
    notifyLowBalance(balanceInfo).catch(() => {});
  }

  return resultPayload;
}

// ========== FUNGSI TIKET TOPUP M-Bal ==========

async function createMBalTicket({ amount, memberId, meta }) {
  if (!config.centerUrl) throw new Error('CENTER_URL is not configured');
  const usedMemberId = memberId || config.memberId;

  if (!usedMemberId || !config.pin || !config.password) {
    throw new Error('Member credentials are not fully configured');
  }

  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0) {
    throw new Error('amount must be > 0');
  }

  const sign = buildBalanceSign({ memberId: usedMemberId });

  const params = new URLSearchParams({
    cmd: 'ticket',
    memberid: String(usedMemberId),
    amount: String(numericAmount),
    sign,
  });

  const url = `${config.centerUrl}/?${params.toString()}`;

  logger.info('Create M-Bal ticket to center', {
    url,
    memberID: usedMemberId,
    amount: numericAmount,
  });

  const ipRes = await safeFetch(url, { method: 'GET' }, 20000);
  const rawText = await ipRes.text();

  logger.info('Response ticket from center', {
    statusCode: ipRes.status,
    memberID: usedMemberId,
    amount: numericAmount,
    raw: rawText,
  });

  const balanceInfo = parseBalance(rawText);
  const providerResult = parseOtomaxMessage(rawText);

  const resultPayload = {
    ok: ipRes.ok,
    statusCode: ipRes.status,
    memberID: usedMemberId,
    amount: numericAmount,
    sign,
    centerUrl: url,
    raw: rawText,
    balanceInfo,
    providerResult,
    meta: meta || null,
    receivedAt: new Date().toISOString(),
  };

  const safeCallbackPayload = sanitizeForCallback(resultPayload);
  postCallback('balance.ticket', safeCallbackPayload).catch(() => {});
  return resultPayload;
}

module.exports = {
  sendTransaction,
  generateRefId,
  parseOtomaxMessage,
  parseBalance,
  classifyTransaction,

  redactRaw,
  sanitizeForCallback,

  checkBalance,
  createMBalTicket,
};
