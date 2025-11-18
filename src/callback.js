const config = require('./config');
const { logger } = require('./logger');

async function postCallback(eventName, payload) {
  if (!config.callbackUrl) return;
  try {
    const res = await fetch(config.callbackUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-auvyn-callback-secret': config.callbackSecret || '',
        'x-auvyn-event': eventName,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn('Callback not ok', {
        status: res.status,
        body: text,
        eventName,
      });
    }
  } catch (err) {
    logger.warn('Callback error', {
      eventName,
      error: err.message || String(err),
    });
  }
}

module.exports = { postCallback };
