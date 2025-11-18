const express = require('express');
const morgan = require('morgan');
const config = require('./config');
const { logger } = require('./logger');

const apiRoutes = require('./routes/api');
const reportRoutes = require('./routes/report');

const app = express();

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan('tiny'));

app.get('/', (req, res) => {
  res.json({
    ok: true,
    name: 'auvyn-apies',
    message: 'IP center bridge online',
    time: new Date().toISOString(),
  });
});

app.use('/api', apiRoutes);
app.use('/report', reportRoutes);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: 'NOT_FOUND',
    message: 'Route not found',
  });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err });
  res.status(500).json({
    ok: false,
    error: 'INTERNAL_ERROR',
    message: err.message || 'Internal server error',
  });
});

function start() {
  app.listen(config.port, () => {
    logger.info(`auvyn-apies listening on port ${config.port}`);
  });
}

module.exports = { app, start };
