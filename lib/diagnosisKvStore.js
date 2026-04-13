'use strict';

/**
 * Vercel / Upstash の KV（環境変数 KV_REST_API_*）が有効なときだけ読み書きする。
 * 未設定なら null / false を返し、従来どおり localStorage のみの動作にフォールバックする。
 */

function hasKvEnv() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function keyForSub(sub) {
  return 'axer:diag:v1:' + String(sub);
}

async function getDiagnosisSnapshotForUser(sub) {
  if (!sub || !hasKvEnv()) return null;
  const { kv } = require('@vercel/kv');
  const v = await kv.get(keyForSub(sub));
  if (!v || typeof v !== 'object') return null;
  if (!Array.isArray(v.items) || v.items.length === 0) return null;
  return v;
}

async function setDiagnosisSnapshotForUser(sub, snapshot) {
  if (!sub || !hasKvEnv()) return false;
  const { kv } = require('@vercel/kv');
  await kv.set(keyForSub(sub), snapshot, { ex: 60 * 60 * 24 * 90 });
  return true;
}

module.exports = {
  hasKvEnv,
  getDiagnosisSnapshotForUser,
  setDiagnosisSnapshotForUser,
};
