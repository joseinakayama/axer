'use strict';

const crypto = require('crypto');
const { createDedicatedToken } = require('./lineDedicatedToken');

function verifyLineSignature(rawBodyBuffer, signature, channelSecret) {
  if (!signature || !channelSecret || !rawBodyBuffer) return false;
  const hash = crypto.createHmac('sha256', channelSecret).update(rawBodyBuffer).digest();
  let sigBuf;
  try {
    sigBuf = Buffer.from(signature, 'base64');
  } catch {
    return false;
  }
  if (sigBuf.length !== hash.length) return false;
  return crypto.timingSafeEqual(sigBuf, hash);
}

async function replyLineMessage(replyToken, messages, channelAccessToken) {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error('[line webhook] reply failed', res.status, t);
  }
}

async function handleLineWebhook(rawBodyBuffer, signatureHeader, env) {
  const channelSecret = env.LINE_CHANNEL_SECRET;
  const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
  const liffId = env.LINE_LIFF_ID;
  const linkSecret = env.LINE_LINK_TOKEN_SECRET || channelSecret;

  if (!channelSecret) {
    console.error('[line webhook] LINE_CHANNEL_SECRET is not set');
    return { status: 200, body: 'OK' };
  }

  if (!verifyLineSignature(rawBodyBuffer, signatureHeader, channelSecret)) {
    return { status: 401, body: 'Invalid signature' };
  }

  let body;
  try {
    body = JSON.parse(rawBodyBuffer.toString('utf8'));
  } catch {
    return { status: 400, body: 'Invalid JSON' };
  }

  const events = body.events || [];
  for (const event of events) {
    if (event.type !== 'follow' || !event.replyToken) continue;
    const userId = event.source && event.source.userId;
    if (!userId || !accessToken) continue;

    let text;
    if (liffId && linkSecret) {
      const token = createDedicatedToken(userId, linkSecret);
      const url = `https://liff.line.me/${liffId}?liff.state=${encodeURIComponent(token)}`;
      text =
        '友だち追加ありがとうございます。\n\n' +
        '下のURLはあなた専用です。LINEアプリ内で開き、本人確認後にご利用ください。\n' +
        url;
    } else {
      console.warn('[line webhook] LINE_LIFF_ID or token secret missing; sending plain text only');
      text =
        '友だち追加ありがとうございます。\n' +
        '（管理者向け: LINE_LIFF_ID と Messaging API トークンを環境変数に設定すると専用URLを自動送信します）';
    }

    await replyLineMessage(event.replyToken, [{ type: 'text', text }], accessToken);
  }

  return { status: 200, body: 'OK' };
}

module.exports = { handleLineWebhook, verifyLineSignature };
