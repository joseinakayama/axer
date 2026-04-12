'use strict';

/**
 * LIFF から呼び出し: idToken（liff.getIDToken()）と liff.state（専用トークン）が同一ユーザか検証
 */

const { handleVerifyDedicated } = require('../../lib/lineVerifyDedicatedHandler');

function parseJsonBody(req) {
  const b = req.body;
  if (b == null) return {};
  if (typeof b === 'string') {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(b)) {
    try {
      return JSON.parse(b.toString('utf8'));
    } catch {
      return {};
    }
  }
  return b;
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
    return;
  }

  const body = parseJsonBody(req);
  const result = await handleVerifyDedicated(body, process.env);
  res.statusCode = result.status;
  res.end(JSON.stringify(result.json));
};
