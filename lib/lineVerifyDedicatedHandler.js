'use strict';

const { verifyLineIdToken } = require('./lineIdTokenVerify');
const { verifyDedicatedToken } = require('./lineDedicatedToken');

function lineVerifyErrorDescription(line) {
  if (!line || typeof line !== 'object') return '';
  return String(line.error_description || line.error || '').trim();
}

function normTokenString(s) {
  return String(s || '')
    .replace(/\u200b/g, '')
    .trim();
}

async function fetchFriendshipFlag(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') return null;
  try {
    const r = await fetch('https://api.line.me/friendship/v1/status', {
      headers: { Authorization: `Bearer ${accessToken.trim()}` },
    });
    if (!r.ok) return null;
    const j = await r.json().catch(() => ({}));
    return typeof j.friendFlag === 'boolean' ? j.friendFlag : null;
  } catch {
    return null;
  }
}

async function handleVerifyDedicated(body, env) {
  const idToken = normTokenString(body.idToken);
  const t = normTokenString(body.t);
  const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
  const clientId = normTokenString(env.LINE_LOGIN_CHANNEL_ID);
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

  /** 1) LINE 推奨: user_id 付き verify */
  let vr = await verifyLineIdToken(idToken, clientId, uidFromToken);

  /** 2) 空白差などで 1) だけ失敗する場合: user_id なしで検証し sub を正規化して突合（同等の安全性） */
  if (!vr.ok) {
    const vrPlain = await verifyLineIdToken(idToken, clientId, null);
    if (vrPlain.ok && normTokenString(vrPlain.profile.sub) === normTokenString(uidFromToken)) {
      vr = vrPlain;
    }
  }

  if (!vr.ok) {
    const desc = lineVerifyErrorDescription(vr.line);
    const subMismatch =
      /Subject Identifier/i.test(desc) ||
      /Invalid IdToken Subject/i.test(desc) ||
      /^Invalid user_id/i.test(desc);

    if (subMismatch) {
      let hint =
        '友だち追加で記録したユーザーIDと、LINEログイン（LIFF）の ID トークン sub が一致しません。Messaging API を使っている「その公式アカウント」と、LINEログインの「Linked LINE Official Account」が同一か再確認してください（別の公式アカウントに紐付いていると ID がズレます）。';
      const friendOk = await fetchFriendshipFlag(accessToken);
      if (friendOk === false) {
        hint +=
          ' また、紐付けた公式アカウントをまだ友だち追加していないと一致しないことがあります。先に友だち追加してからリンクを開いてください。';
      }
      console.error('[verify-dedicated] token_mismatch', {
        line_error: desc || null,
        friendFlag: friendOk,
      });
      return {
        status: 403,
        json: {
          ok: false,
          error: 'token_mismatch',
          line_error: desc || undefined,
          hint,
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
