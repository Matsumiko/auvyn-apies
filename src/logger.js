const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
const config = require('./config');

// Ensure logs dir exists
if (!fs.existsSync(config.logsDir)) {
  fs.mkdirSync(config.logsDir, { recursive: true });
}

const baseFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp(),
  format.printf(info => {
    return `${info.timestamp} [${info.level}] ${info.message} ${info.stack || ''}`;
  })
);

const mainLogger = createLogger({
  level: 'info',
  format: baseFormat,
  defaultMeta: { service: 'auvyn-apies' },
  transports: [
    new transports.Console({ format: consoleFormat }),
    new transports.File({ filename: path.join(config.logsDir, 'combined.log') }),
    new transports.File({ filename: path.join(config.logsDir, 'error.log'), level: 'error' }),
  ],
});

function createTrxLogger(filename) {
  return createLogger({
    level: 'info',
    format: baseFormat,
    defaultMeta: { service: 'auvyn-apies' },
    transports: [
      new transports.File({ filename: path.join(config.logsDir, filename) }),
    ],
  });
}

const trxSuccessLogger = createTrxLogger('trx-success.log');
const trxFailedLogger = createTrxLogger('trx-failed.log');
const trxPendingLogger = createTrxLogger('trx-pending.log');
const reportLogger = createTrxLogger('report.log');

module.exports = {
  logger: mainLogger,
  trxSuccessLogger,
  trxFailedLogger,
  trxPendingLogger,
  reportLogger,
};
