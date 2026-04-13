/**
 * LIFF ログイン中のユーザーが診断結果をサーバー（KV）に保存する
 */

'use strict';

const { handleSaveDiagnosis } = require('../../lib/lineSaveDiagnosisHandler.js');

const handler = {
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
      return Response.json(
        { ok: false, error: 'method_not_allowed' },
        {
          status: 405,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const result = await handleSaveDiagnosis(body, process.env);
    return Response.json(result.json, {
      status: result.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  },
};

handler.config = { runtime: 'nodejs' };

module.exports = handler;
