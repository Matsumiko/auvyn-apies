const config = require('./config');
const { logger } = require('./logger');

async function sendTelegramMessage(botToken, chatId, text, extra = {}) {
  if (!botToken || !chatId) return;
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const body = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...extra,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!data.ok) {
      logger.warn('Telegram sendMessage failed', { data });
    }
  } catch (err) {
    logger.warn('Telegram sendMessage error', { error: err.message || String(err) });
  }
}

function formatJsonBlock(obj) {
  try {
    return `<pre>${JSON.stringify(obj, null, 2)}</pre>`;
  } catch {
    return '';
  }
}

async function notifyTrx(category, payload) {
  const tgc = config.telegram;
  let token, chatId, prefix;

  switch (category) {
    case 'success':
      token = tgc.successBotToken;
      chatId = tgc.successChatId;
      prefix = '✅ TRX SUCCESS';
      break;
    case 'pending':
      token = tgc.pendingBotToken;
      chatId = tgc.pendingChatId;
      prefix = '🕒 TRX PENDING';
      break;
    case 'failed':
      token = tgc.failedBotToken;
      chatId = tgc.failedChatId;
      prefix = '❌ TRX FAILED';
      break;
    default:
      token = tgc.systemBotToken;
      chatId = tgc.systemChatId;
      prefix = 'ℹ️ TRX UNKNOWN';
      break;
  }

  if (!token || !chatId) return;

  const lines = [
    `${prefix}`,
    ``,
    `<b>RefID</b>: ${payload.refID || '-'}`,
    `<b>Produk</b>: ${payload.product || '-'}`,
    `<b>Tujuan</b>: ${payload.dest || '-'}`,
    `<b>Qty</b>: ${payload.qty || 1}`,
    `<b>Status HTTP</b>: ${payload.statusCode}`,
    `<b>Source</b>: auvyn-apies`,
    ``,
    `<b>Raw</b>:`,
    `<pre>${String(payload.raw || '').slice(0, 4000)}</pre>`,
  ];

  if (payload.balanceInfo && typeof payload.balanceInfo.remaining === 'number') {
    lines.push('');
    lines.push(`<b>Saldo Tersisa</b>: Rp ${payload.balanceInfo.remaining.toLocaleString('id-ID')}`);
  }

  if (payload.meta) {
    lines.push('');
    lines.push('<b>Meta</b>:');
    lines.push(formatJsonBlock(payload.meta));
  }

  await sendTelegramMessage(token, chatId, lines.join('\n'));
}

async function notifyLowBalance(balanceInfo) {
  const tgc = config.telegram;
  const token = tgc.systemBotToken;
  const chatId = tgc.systemChatId;
  if (!token || !chatId) return;

  const lines = [
    '⚠️ <b>Saldo Rendah</b>',
    '',
    `<b>Saldo Tersisa</b>: Rp ${balanceInfo.remaining.toLocaleString('id-ID')}`,
    `<b>Detail</b>:`,
    `<pre>${JSON.stringify(balanceInfo, null, 2)}</pre>`,
  ];

  await sendTelegramMessage(token, chatId, lines.join('\n'));
}

async function notifyReport(reportPayload) {
  const tgc = config.telegram;
  const token = tgc.systemBotToken;
  const chatId = tgc.systemChatId;
  if (!token || !chatId) return;

  const lines = [
    '📨 <b>IP Center Report</b>',
    '',
    `<b>Method</b>: ${reportPayload.method}`,
    `<b>IP</b>: ${reportPayload.ip || '-'}`,
    '',
    '<b>Query</b>:',
    formatJsonBlock(reportPayload.query || {}),
    '',
    '<b>Body</b>:',
    formatJsonBlock(reportPayload.body || {}),
  ];

  await sendTelegramMessage(token, chatId, lines.join('\n'));
}

module.exports = {
  notifyTrx,
  notifyLowBalance,
  notifyReport,
};
