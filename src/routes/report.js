// src/routes/report.js
const express = require('express');
const {
  reportLogger,
  trxSuccessLogger,
  trxFailedLogger,
  trxPendingLogger
} = require('../logger');

const { notifyReport, notifyTrx } = require('../telegram');
const { postCallback } = require('../callback');
const { getPending, deletePending } = require('../store');
const {
  parseOtomaxMessage,
  parseBalance,
  sanitizeForCallback
} = require('../ipCenter');

const router = express.Router();

/**
 * Klasifikasi kategori final dari report provider.
 */
function classifyFromReport(message, statusCode) {
  const rawText = String(message || '');
  const st = String(statusCode || '');

  if (st === '20' || /SUKSES|Sukses/i.test(rawText)) return 'success';
  if (st && st !== '1' && /GAGAL|FAIL|ERROR/i.test(rawText)) return 'failed';

  const parsed = parseOtomaxMessage(rawText);
  if (parsed.state === 'SUCCESS') return 'success';
  if (parsed.state === 'FAILED') return 'failed';

  return 'pending';
}

router.all('/', async (req, res) => {
  const q = req.query || {};
  const body = req.body || {};

  const refID = String(
    q.refid || q.refID || body.refid || body.refID || ''
  ).trim();

  const message = String(q.message || body.message || '');
  const statusProvider = String(q.status || body.status || '');

  // Payload mentah report (buat audit internal)
  const rawReportPayload = {
    ok: true,
    event: 'transaction.report',
    method: req.method,
    query: q,
    body,
    headers: req.headers,
    ip: req.ip,
    receivedAt: new Date().toISOString(),
  };
  reportLogger.info(rawReportPayload);

  // Lookup transaksi awal biar meta.orderId kebawa
  const pending = getPending(refID);

  const providerResult = parseOtomaxMessage(message);
  const balanceInfo = parseBalance(message);
  const category = classifyFromReport(message, statusProvider);

  // Payload FINAL full (untuk log internal + Telegram internal)
  const finalPayload = {
    ok: category !== 'failed',
    statusCode: 200,
    refID: refID || pending?.refID || null,
    product: pending?.product || null,
    dest: pending?.dest || providerResult.tujuan || null,
    qty: pending?.qty || 1,
    sign: pending?.firstPayload?.sign || null,
    centerUrl: pending?.firstPayload?.centerUrl || null,
    raw: message,
    meta: pending?.meta || null,
    balanceInfo,
    category,
    providerResult: {
      ...providerResult,
      code: providerResult.code || statusProvider || providerResult.code,
    },
    isDuplicate: !!providerResult.duplicate,
    receivedAt: new Date().toISOString(),
  };

  // Log internal tetap full
  if (category === 'success') trxSuccessLogger.info(finalPayload);
  else if (category === 'failed') trxFailedLogger.info(finalPayload);
  else trxPendingLogger.info(finalPayload);

  // Notif internal tetap full
  notifyTrx(category, finalPayload).catch(() => {});
  notifyReport(rawReportPayload).catch(() => {});

  // Callback FINAL ke Worker versi aman
  const safeFinal = sanitizeForCallback(finalPayload);
  postCallback('transaction.report', safeFinal).catch(() => {});

  // bersihin pending kalau final
  if (category === 'success' || category === 'failed') {
    deletePending(refID);
  }

  res.type('text/plain').send('OK');
});

module.exports = router;
