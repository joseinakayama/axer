'use strict';

const { verifyLineIdToken } = require('./lineIdTokenVerify');
const { verifyDedicatedToken } = require('./lineDedicatedToken');

function lineVerifyErrorDescription(line) {
  if (!line || typeof line !== 'object') return '';
  return String(line.error_description || line.error || '').trim();
}

async function handleVerifyDedicated(body, env) {
  const idToken = body.idToken;
  const t = body.t;
  const clientId = env.LINE_LOGIN_CHANNEL_ID;
  const linkSecret = env.LINE_LINK_TOKEN_SECRET || env.LINE_CHANNEL_SECRET;

  if (!idToken || !t || !clientId || !linkSecret) {
    return { status: 400, json: { ok: false, error: 'missing_params' } };
  }

  const uidFromToken = verifyDedicatedToken(t, linkSecret);
  if (!uidFromToken) {
    return {
      status: 403,
      json: { ok: false, error: 'invalid_or_expired_link_token' },
    };
  }

  /** Messaging の友だち userId を user_id として渡し、LINE が ID トークンの sub と突合する */
  const vr = await verifyLineIdToken(idToken, clientId, uidFromToken);
  if (!vr.ok) {
    const desc = lineVerifyErrorDescription(vr.line);
    const subMismatch =
      /subject/i.test(desc) ||
      /Subject Identifier/i.test(desc) ||
      /user_id/i.test(desc);

    if (subMismatch) {
      return {
        status: 403,
        json: {
          ok: false,
          error: 'token_mismatch',
          line_error: desc || undefined,
          hint:
            '友だち追加で記録したユーザーIDと、LINEログイン（LIFF）のユーザーIDが一致しません。LINE Developers の「LINEログイン」チャネルで、使用中の公式アカウント（Messaging API と同じ OA）を「Linked LINE Official Account」に紐付けたうえで、LIFF もそのログインチャネルに置いてください。別チャネルのままだと同一人物でも ID がズレます。',
        },
      };
    }

    return {
      status: 401,
      json: {
        ok: false,
        error: 'invalid_id_token',
        line_error: desc || undefined,
        hint:
          'LINE_LOGIN_CHANNEL_ID は LIFF を作成した「LINEログイン」のチャネルID（数値）です。LIFF ID のハイフンより前と同じか確認してください。',
      },
    };
  }

  const profile = vr.profile;
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
