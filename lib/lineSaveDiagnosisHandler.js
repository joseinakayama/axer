'use strict';

const { verifyLineIdToken } = require('./lineIdTokenVerify');
const { setDiagnosisSnapshotForUser, hasKvEnv } = require('./diagnosisKvStore');

function normTokenString(s) {
  return String(s || '')
    .replace(/\u200b/g, '')
    .trim();
}

function sanitizeDiagnosisPayload(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) return null;
  const items = raw.items
    .slice(0, 60)
    .map((i) => {
      const num = Number(i.num);
      let score = null;
      if (i.score !== null && i.score !== undefined) {
        const n = Number(i.score);
        score = Number.isFinite(n) ? n : null;
      }
      return {
        num,
        score,
        detail: String(i.detail || '').slice(0, 8000),
      };
    })
    .filter((i) => Number.isFinite(i.num) && i.num >= 1 && i.num <= 99);
  if (items.length === 0) return null;
  return {
    url: String(raw.url || '').slice(0, 2048),
    items,
    totalScore: raw.totalScore != null ? Number(raw.totalScore) : null,
    maxScore: raw.maxScore != null ? Number(raw.maxScore) : null,
    autoCount: raw.autoCount != null ? Number(raw.autoCount) : null,
    manualCount: raw.manualCount != null ? Number(raw.manualCount) : null,
    savedAt: raw.savedAt != null ? Number(raw.savedAt) : Date.now(),
  };
}

async function handleSaveDiagnosis(body, env) {
  const idToken = normTokenString(body.idToken);
  const clientId = normTokenString(env.LINE_LOGIN_CHANNEL_ID);
  if (!idToken || !clientId) {
    return { status: 400, json: { ok: false, error: 'missing_params' } };
  }

  const vr = await verifyLineIdToken(idToken, clientId, null);
  if (!vr.ok) {
    return { status: 401, json: { ok: false, error: 'invalid_id_token' } };
  }

  const sub = normTokenString(vr.profile.sub);
  if (!sub) {
    return { status: 401, json: { ok: false, error: 'invalid_id_token' } };
  }

  const diagnosis = sanitizeDiagnosisPayload(body.diagnosis);
  if (!diagnosis) {
    return { status: 400, json: { ok: false, error: 'invalid_diagnosis' } };
  }

  if (!hasKvEnv()) {
    return {
      status: 200,
      json: { ok: true, saved: false, reason: 'kv_not_configured' },
    };
  }

  const saved = await setDiagnosisSnapshotForUser(sub, diagnosis);
  return { status: 200, json: { ok: true, saved } };
}

/**
 * analyze50 成功直後に呼ぶ。idToken が有効なら KV にスナップショットを保存する。
 */
async function persistDiagnosisKvAfterAnalyze(idToken, runResult, env) {
  if (!idToken || !runResult || !Array.isArray(runResult.items)) return;
  if (!hasKvEnv()) return;
  const clientId = normTokenString(env.LINE_LOGIN_CHANNEL_ID);
  if (!clientId) return;
  const vr = await verifyLineIdToken(normTokenString(idToken), clientId, null);
  if (!vr.ok) return;
  const sub = normTokenString(vr.profile.sub);
  if (!sub) return;
  const snapshot = {
    url: runResult.url,
    items: runResult.items.map((i) => ({
      num: i.num,
      score: i.score,
      detail: i.detail != null ? String(i.detail) : '',
    })),
    totalScore: runResult.totalScore,
    maxScore: runResult.maxScore,
    autoCount: runResult.autoCount,
    manualCount: runResult.manualCount,
    savedAt: Date.now(),
  };
  await setDiagnosisSnapshotForUser(sub, snapshot);
}

module.exports = { handleSaveDiagnosis, persistDiagnosisKvAfterAnalyze };
