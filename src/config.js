const path = require('path');
require('dotenv').config();

const config = {
  port: process.env.PORT || 5882,
  centerUrl: (process.env.CENTER_URL || '').replace(/\/+$/, ''),
  memberId: process.env.MEMBER_ID || '',
  pin: process.env.PIN || '',
  password: process.env.PASSWORD || '',
  secret: process.env.AUVYN_SECRET || '',
  callbackUrl: process.env.CALLBACK_URL || '',
  callbackSecret: process.env.CALLBACK_SECRET || process.env.AUVYN_SECRET || '',
  signPrefix: process.env.SIGN_PREFIX || 'ENGINE',
  logsDir: process.env.LOGS_DIR || path.join(__dirname, '..', 'logs'),
  balanceLowLimit: Number(process.env.BALANCE_LOW_LIMIT || '50000') || 0,
  telegram: {
    successBotToken: process.env.TG_SUCCESS_BOT_TOKEN || '',
    successChatId: process.env.TG_SUCCESS_CHAT_ID || '',
    pendingBotToken: process.env.TG_PENDING_BOT_TOKEN || '',
    pendingChatId: process.env.TG_PENDING_CHAT_ID || '',
    failedBotToken: process.env.TG_FAILED_BOT_TOKEN || '',
    failedChatId: process.env.TG_FAILED_CHAT_ID || '',
    systemBotToken: process.env.TG_SYSTEM_BOT_TOKEN || '',
    systemChatId: process.env.TG_SYSTEM_CHAT_ID || '',
  },
};

module.exports = config;
