'use strict';

const { verifyLineIdToken } = require('./lineIdTokenVerify');
const { verifyDedicatedToken } = require('./lineDedicatedToken');

async function handleVerifyDedicated(body, env) {
  const idToken = body.idToken;
  const t = body.t;
  const clientId = env.LINE_LOGIN_CHANNEL_ID;
  const linkSecret = env.LINE_LINK_TOKEN_SECRET || env.LINE_CHANNEL_SECRET;

  if (!idToken || !t || !clientId || !linkSecret) {
    return { status: 400, json: { ok: false, error: 'missing_params' } };
  }

  const profile = await verifyLineIdToken(idToken, clientId);
  if (!profile) {
    return { status: 401, json: { ok: false, error: 'invalid_id_token' } };
  }

  const uidFromToken = verifyDedicatedToken(t, linkSecret);
  if (!uidFromToken) {
    return {
      status: 403,
      json: { ok: false, error: 'invalid_or_expired_link_token' },
    };
  }

  if (uidFromToken !== profile.sub) {
    return {
      status: 403,
      json: {
        ok: false,
        error: 'token_mismatch',
        hint:
          'Messaging API の友だち userId と LINE Login の ID トークン sub が一致していません。LINE Developers で Messaging API チャネルと LINE ログイン（LIFF）チャネルを同一プロバイダーで連携するか、ユーザ ID が揃う設定にしてください。',
      },
    };
  }

  return {
    status: 200,
    json: {
      ok: true,
      displayName: profile.name || '',
      picture: profile.picture || '',
    },
  };
}

module.exports = { handleVerifyDedicated };
