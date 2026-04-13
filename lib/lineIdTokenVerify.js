'use strict';

/**
 * @param {string} idToken
 * @param {string} clientId  LINE ログイン（LIFF）チャネル ID
 * @param {string|null} expectedUserId  省略可。指定時は POST に user_id を付与し LINE が sub と突合する
 * @returns {Promise<{ ok: true, profile: object } | { ok: false, status?: number, line?: object }>}
 * @see https://developers.line.biz/en/reference/line-login/#verify-id-token
 */
async function verifyLineIdToken(idToken, clientId, expectedUserId = null) {
  if (!idToken || !clientId) return { ok: false };
  const params = new URLSearchParams({
    id_token: idToken,
    client_id: String(clientId),
  });
  if (expectedUserId != null && String(expectedUserId).length > 0) {
    params.set('user_id', String(expectedUserId));
  }
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status, line: json };
  }
  if (!json.sub) return { ok: false, line: json };
  return { ok: true, profile: json };
}

module.exports = { verifyLineIdToken };
