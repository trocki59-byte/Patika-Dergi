const encoder = new TextEncoder();

function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

export function createToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export async function hashToken(token, secret) {
  if (!token || !secret) throw new TypeError('Token and secret are required');
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']
  );
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(token))));
}
