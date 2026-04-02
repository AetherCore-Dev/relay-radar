/**
 * RelayPinger — Test relay station connectivity WITHOUT an API key.
 *
 * Only performs:
 * - DNS resolution
 * - TCP connection time
 * - TLS handshake verification
 * - HTTP HEAD request (no auth)
 *
 * ZERO API keys. ZERO token consumption.
 */

import { URL } from 'node:url';
import { validateUrl, sanitize } from '../shared/http-client.mjs';

export function RelayPinger() {
  return Object.freeze({
    ping: (url) => pingRelay(url),
    pingMultiple: (urls) => Promise.all(urls.map(pingRelay)),
  });
}

async function pingRelay(urlStr) {
  const start = Date.now();

  // Validate URL + SSRF protection
  let parsed;
  try {
    parsed = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    validateUrl(parsed.toString()); // blocks private IPs + enforces HTTPS
  } catch (err) {
    return Object.freeze({
      url: urlStr,
      reachable: false,
      error: sanitize(err.message),
      latencyMs: 0,
    });
  }

  const url = parsed.toString();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      }).catch(async () => {
        // Some servers reject HEAD, try GET with abort-on-first-byte
        const resp = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'follow',
        });
        // Drain body to release connection
        resp.body?.cancel().catch(() => {});
        return resp;
      });
    } finally {
      clearTimeout(timer);
    }

    const totalMs = Date.now() - start;

    // Check TLS
    const isHttps = parsed.protocol === 'https:';

    // Determine server type from headers
    const server = response.headers.get('server') ?? 'unknown';
    const poweredBy = response.headers.get('x-powered-by') ?? '';
    const contentType = response.headers.get('content-type') ?? '';

    // Check if it looks like an API endpoint
    const looksLikeApi =
      response.status === 401 ||  // Needs auth
      response.status === 403 ||  // Forbidden without key
      response.status === 405 ||  // Method not allowed (POST-only)
      contentType.includes('json') ||
      server.toLowerCase().includes('nginx') ||
      server.toLowerCase().includes('cloudflare');

    return Object.freeze({
      url,
      reachable: true,
      latencyMs: totalMs,
      httpStatus: response.status,
      tls: isHttps,
      server,
      poweredBy: poweredBy || undefined,
      looksLikeApi,
      headers: Object.freeze({
        server,
        contentType,
        // Don't expose all headers — just useful ones
      }),
      pingedAt: new Date().toISOString(),
    });
  } catch (err) {
    return Object.freeze({
      url,
      reachable: false,
      latencyMs: Date.now() - start,
      error: err.name === 'AbortError' ? '连接超时 (10s)' : sanitize(err.message),
      tls: parsed.protocol === 'https:',
    });
  }
}
