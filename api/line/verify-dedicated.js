/**
 * LIFF から呼び出し: idToken と liff.state（専用トークン）の突合
 * Web 標準 fetch ハンドラ（default の (req,res) 関数は環境によってはルート未登録になり 404 になり得る）
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { handleVerifyDedicated } = require('../../lib/lineVerifyDedicatedHandler.js');

export const config = { runtime: 'nodejs' };

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return Response.json({ ok: false, error: 'method_not_allowed' }, {
        status: 405,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const result = await handleVerifyDedicated(body, process.env);
    return Response.json(result.json, {
      status: result.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  },
};
