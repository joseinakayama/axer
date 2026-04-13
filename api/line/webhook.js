/**
 * LINE Messaging API Webhook（Vercel Node.js）
 *
 * Edge から api.line.me への fetch がタイムアウトしやすいため Node ランタイムを使用。
 * Web Request / Response API で生ボディを検証。
 *
 * 環境変数: LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN, LINE_LIFF_ID
 */

export const config = { runtime: 'nodejs' };

function bytesToBase64Url(u8) {
  const bytes = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8);
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64DecodeToUint8Array(b64) {
  let s = b64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return new Uint8Array(Buffer.from(s + pad, 'base64'));
}

async function verifyLineSignature(rawBody, signatureHeader, channelSecret) {
  if (!signatureHeader || !channelSecret || rawBody == null) return false;
  let expected;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(channelSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
    expected = new Uint8Array(sig);
  } catch {
    return false;
  }
  let actual;
  try {
    actual = base64DecodeToUint8Array(signatureHeader.trim());
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

async function createDedicatedToken(userId, secret, ttlMs = 7 * 24 * 60 * 60 * 1000) {
  const exp = Date.now() + ttlMs;
  const payload = JSON.stringify({ u: userId, exp });
  const payloadB64 = bytesToBase64Url(new TextEncoder().encode(payload));
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  const sigB64url = bytesToBase64Url(sigBytes);
  return `${payloadB64}.${sigB64url}`;
}

/** Node から LINE API までの往復に余裕を持たせる（Edge より安定しやすい） */
const LINE_FETCH_TIMEOUT_MS = 20000;

async function fetchLine(url, init) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), LINE_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (e.name === 'AbortError') {
      console.error('[line webhook] fetch timeout', LINE_FETCH_TIMEOUT_MS + 'ms', url);
    } else {
      console.error('[line webhook] fetch error', url, e);
    }
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function deliverFollowMessage(accessToken, userId, replyToken, text) {
  const auth = `Bearer ${accessToken.trim()}`;
  const headers = { 'Content-Type': 'application/json', Authorization: auth };

  const pushRes = await fetchLine('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers,
    body: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
  });
  if (pushRes && pushRes.ok) return;
  if (pushRes) {
    const pushErr = await pushRes.text();
    console.error('[line webhook] push failed', pushRes.status, pushErr);
  }

  if (replyToken) {
    const replyRes = await fetchLine('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers,
      body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
    });
    if (replyRes && replyRes.ok) return;
    if (replyRes) {
      console.error('[line webhook] reply failed', replyRes.status, await replyRes.text());
    }
  }
}

export default async function handler(request) {
  if (request.method === 'GET') {
    return new Response(
      'OK: LINE Webhook (POST only). Set this URL in LINE Developers → Messaging API → Webhook.',
      { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-line-signature');
  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim();
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const liffId = process.env.LINE_LIFF_ID?.trim();
  const linkSecret = (process.env.LINE_LINK_TOKEN_SECRET || channelSecret || '').trim();

  if (!channelSecret) {
    return new Response('LINE_CHANNEL_SECRET missing (Vercel Production に設定してください)', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const valid = await verifyLineSignature(rawBody, signature, channelSecret);
  if (!valid) {
    return new Response('Invalid signature', { status: 401 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const events = Array.isArray(body.events) ? body.events : [];
  if (events.length > 0) {
    console.log(
      '[line webhook] events:',
      events.map((e) => e.type).join(',') || '(empty)'
    );
  }

  const deliveries = [];
  for (const event of events) {
    if (event.type !== 'follow') continue;
    const userId = event.source && event.source.userId;
    const replyToken = event.replyToken;
    if (!userId) continue;

    if (!accessToken) {
      console.error('[line webhook] LINE_CHANNEL_ACCESS_TOKEN is missing (Vercel Env を確認)');
      continue;
    }

    let text;
    if (liffId && linkSecret) {
      const token = await createDedicatedToken(userId, linkSecret);
      const url = `https://liff.line.me/${liffId}?liff.state=${encodeURIComponent(token)}`;
      text =
        '【診断レポート用】\n' +
        '下のURLはあなた専用です。LINEアプリ内でタップして開いてください。\n\n' +
        url;
    } else {
      text =
        '（管理者向け: Vercel に LINE_LIFF_ID を設定すると専用URLを送れます）';
    }

    deliveries.push(deliverFollowMessage(accessToken, userId, replyToken, text));
  }

  await Promise.all(deliveries);

  return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
