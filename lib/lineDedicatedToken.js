'use strict';

const crypto = require('crypto');

function createDedicatedToken(userId, secret, ttlMs = 7 * 24 * 60 * 60 * 1000) {
  const u = String(userId || '')
    .replace(/\u200b/g, '')
    .trim();
  const exp = Date.now() + ttlMs;
  const payload = JSON.stringify({ u, exp });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function verifyDedicatedToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  if (!timingSafeEqualStr(sig, expected)) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!data || typeof data.u !== 'string' || typeof data.exp !== 'number') return null;
  if (Date.now() > data.exp) return null;
  return String(data.u || '')
    .replace(/\u200b/g, '')
    .trim();
}

module.exports = { createDedicatedToken, verifyDedicatedToken };
