const express = require('express');
const { sendTransaction, checkBalance, createMBalTicket } = require('../ipCenter');
const { requireSecret } = require('../middleware/auth');

const router = express.Router();

// Simple ping
router.post('/ping', requireSecret, (req, res) => {
  res.json({
    ok: true,
    message: 'pong',
    time: new Date().toISOString(),
  });
});

// ========== Cek Saldo (M-Bal) ==========
//  POST /api/balance
//  Headers: x-auvyn-secret: <AUVYN_SECRET>
//  Body (opsional):
//    { "memberId": "AG000001", "meta": {...} }

router.post('/balance', requireSecret, async (req, res) => {
  const { memberId, meta } = req.body || {};
  try {
    const result = await checkBalance({ memberId, meta });
    return res.json(result);
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: 'CENTER_ERROR',
      message: err.message || 'Failed to check balance',
    });
  }
});

// ========== Tiket Topup M-Bal ==========
//  POST /api/ticket-mbal
//  Headers: x-auvyn-secret: <AUVYN_SECRET>
//  Body:
//    { "amount": 25000000, "memberId": "AG000001", "meta": {...} }

router.post('/ticket-mbal', requireSecret, async (req, res) => {
  const { amount, memberId, meta } = req.body || {};

  if (!amount) {
    return res.status(400).json({
      ok: false,
      error: 'BAD_REQUEST',
      message: 'amount is required',
    });
  }

  try {
    const result = await createMBalTicket({ amount, memberId, meta });
    return res.json(result);
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: 'CENTER_ERROR',
      message: err.message || 'Failed to create ticket',
    });
  }
});

// ========== TRX BIASA ==========

router.post('/transaction', requireSecret, async (req, res) => {
  const { product, dest, qty, refID, meta } = req.body || {};

  if (!product || !dest) {
    return res.status(400).json({
      ok: false,
      error: 'BAD_REQUEST',
      message: 'product and dest are required',
    });
  }

  try {
    const result = await sendTransaction({ product, dest, qty, refID, meta });
    return res.json(result);
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: 'CENTER_ERROR',
      message: err.message || 'Failed to call center',
    });
  }
});

module.exports = router;
