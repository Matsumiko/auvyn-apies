const config = require('../config');

function requireSecret(req, res, next) {
  const provided =
    req.headers['x-auvyn-secret'] ||
    req.headers['x-auvyn-token'] ||
    req.query.secret;

  if (!config.secret) {
    return res.status(500).json({
      ok: false,
      error: 'SERVER_MISCONFIGURED',
      message: 'AUVYN_SECRET is not set on server',
    });
  }

  if (!provided || String(provided) !== String(config.secret)) {
    return res.status(401).json({
      ok: false,
      error: 'UNAUTHORIZED',
      message: 'Missing or invalid auvyn secret',
    });
  }
  next();
}

module.exports = { requireSecret };
