const express = require('express');
const { sendTransaction } = require('../ipCenter');
const { requireSecret } = require('../middleware/auth');

const router = express.Router();

router.post('/ping', requireSecret, (req, res) => {
  res.json({
    ok: true,
    message: 'pong',
    time: new Date().toISOString(),
  });
});

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
