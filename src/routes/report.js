const express = require('express');
const { reportLogger } = require('../logger');
const { notifyReport } = require('../telegram');
const { postCallback } = require('../callback');

const router = express.Router();

router.all('/', async (req, res) => {
  const payload = {
    ok: true,
    event: 'transaction.report',
    method: req.method,
    query: req.query || {},
    body: req.body || null,
    headers: req.headers,
    ip: req.ip,
    receivedAt: new Date().toISOString(),
  };

  reportLogger.info(payload);

  // Fire-and-forget notify & callback
  notifyReport(payload).catch(() => {});
  postCallback('transaction.report', payload).catch(() => {});

  res.type('text/plain').send('OK');
});

module.exports = router;
