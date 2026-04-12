'use strict';

/**
 * LINE Messaging API Webhook（友だち追加 = follow イベント）
 * コンソールの Webhook URL: https://<ドメイン>/api/line/webhook
 *
 * 環境変数: LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN, LINE_LIFF_ID
 * 任意: LINE_LINK_TOKEN_SECRET（未設定時は CHANNEL_SECRET を署名鍵に使用）
 */

const getRawBody = require('raw-body');
const { handleLineWebhook } = require('../../lib/lineWebhookCore');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  let buf;
  try {
    buf = await getRawBody(req, {
      length: req.headers['content-length'],
      limit: '256kb',
      encoding: false,
    });
  } catch (e) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }

  const signature = req.headers['x-line-signature'];
  const result = await handleLineWebhook(buf, signature, process.env);

  res.statusCode = result.status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(typeof result.body === 'string' ? result.body : 'OK');
};
