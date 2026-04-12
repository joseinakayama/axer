'use strict';

async function verifyLineIdToken(idToken, clientId) {
  if (!idToken || !clientId) return null;
  const params = new URLSearchParams({
    id_token: idToken,
    client_id: String(clientId),
  });
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  if (!json.sub) return null;
  return json;
}

module.exports = { verifyLineIdToken };
