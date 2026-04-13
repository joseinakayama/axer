'use strict';

const { runDiagnosis, mapAxiosError } = require('../lib/runDiagnosis');
const { persistDiagnosisKvAfterAnalyze } = require('../lib/lineSaveDiagnosisHandler');

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
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, idToken } = parseJsonBody(req);

  try {
    const data = await runDiagnosis(url);
    try {
      if (idToken) {
        await persistDiagnosisKvAfterAnalyze(idToken, data, process.env);
      }
    } catch (e) {
      /* KV やトークン周りの失敗は診断レスポンスを阻害しない */
    }
    return res.status(200).json(data);
  } catch (err) {
    const mapped = mapAxiosError(err);
    return res.status(mapped.status).json(mapped.body);
  }
};
