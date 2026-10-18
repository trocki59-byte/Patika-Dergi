import { subscribe, confirm, unsubscribe } from './subscribers.mjs';
import { pollFeeds } from './feeds.mjs';
import { deliverQueued } from './delivery.mjs';

const allowedOrigins = new Set(['https://patikadergi.org', 'https://www.patikadergi.org']);

function corsHeaders(origin) {
  return allowedOrigins.has(origin) ? {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    'vary': 'Origin'
  } : {};
}

function withCors(response, origin) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(origin))) headers.set(key, value);
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}

async function route(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, {status: 204});
  if (request.method === 'POST' && url.pathname === '/v1/subscribe') return subscribe(request, env);
  if (request.method === 'GET' && url.pathname === '/v1/confirm') return confirm(url.searchParams.get('token'), env);
  if (['GET', 'POST'].includes(request.method) && url.pathname === '/v1/unsubscribe') return unsubscribe(url.searchParams.get('token'), env);
  return Response.json({ok: false, error: {code: 'not_found', message: 'Uç nokta bulunamadı.'}}, {status: 404});
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';
    if (origin && !allowedOrigins.has(origin)) {
      return Response.json({ok: false, error: {code: 'origin_not_allowed', message: 'Bu origin için erişim yok.'}}, {status: 403});
    }
    try { return withCors(await route(request, env), origin); }
    catch (cause) {
      console.error(cause);
      return withCors(Response.json({ok: false, error: {code: 'internal_error', message: 'İstek işlenemedi.'}}, {status: 500}), origin);
    }
  },
  scheduled(_event, env, ctx) {
    ctx.waitUntil((async () => {
      await pollFeeds(env);
      await deliverQueued(env, 100);
    })());
  }
};
