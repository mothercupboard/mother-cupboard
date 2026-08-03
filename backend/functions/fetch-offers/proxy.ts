/**
 * Residential-proxy egress via DataImpulse. Routes a fetch through a
 * residential IP so the request doesn't leave from the AWS datacenter range
 * that Aldi IE / Tesco IE / Sainsbury's / the Woolworths sites block. Aldi UK
 * and the direct adapters (Asda, SuperValu) are NOT proxied.
 *
 * DataImpulse gateway (gw.dataimpulse.com):
 *   - rotating: PROXY_PORT (823) — a fresh IP per request.
 *   - sticky:   ports 10000-19999, each holds one IP ~30 min. We derive a
 *               deterministic port from the session string so a multi-step
 *               flow (Woolworths AU: GET cookies -> POST) keeps one exit IP.
 *   - country:  appended to the username. Default is DataImpulse's `__cr.<cc>`
 *               (ISO alpha-2, lower). If a run 407s, the provider wants a
 *               different form — no code change needed, just set
 *               PROXY_COUNTRY_FLAG in .env (e.g. `.country-{cc}`); `{cc}` is
 *               replaced with the country code.
 *   - session:  default is port-based sticky (above). If the provider does
 *               sticky via the username instead, set PROXY_SESSION_FLAG
 *               (e.g. `__sid.{id}`); `{id}` is replaced with the session, and
 *               the base PROXY_PORT is used rather than a sticky port.
 *
 * Config from env (mirrored into the Lambda via serverless.yml
 * provider.environment + dotenv include):
 *   PROXY_HOST, PROXY_PORT, PROXY_USERNAME, PROXY_PASSWORD
 *   PROXY_COUNTRY_FLAG (optional), PROXY_SESSION_FLAG (optional)
 * If PROXY_HOST is unset the helper returns undefined and fetch falls back to
 * a direct connection, so nothing breaks when the proxy isn't configured.
 *
 * DataImpulse is a plain CONNECT proxy (no TLS interception), so unlike the
 * previous provider there is no requestTls override — the origin certificate
 * is validated normally.
 */

import { Buffer } from 'node:buffer';
import { ProxyAgent } from 'undici';

const HOST = process.env.PROXY_HOST;
const PORT = process.env.PROXY_PORT ?? '823';
const USER = process.env.PROXY_USERNAME ?? '';
const PASS = process.env.PROXY_PASSWORD ?? '';
// Username-tag templates. Empty country flag falls back to DataImpulse's
// `__cr.{cc}`. Empty session flag means sticky is done by port (below).
const CC_FLAG = process.env.PROXY_COUNTRY_FLAG || '__cr.{cc}';
const SID_FLAG = process.env.PROXY_SESSION_FLAG || '';

// Adapters speak loose region tags; map to DataImpulse ISO country codes.
const COUNTRY: Record<string, string> = {
  uk: 'gb',
  gb: 'gb',
  eu: 'ie', // only the Irish adapters use 'eu' — target Ireland
  ie: 'ie',
  au: 'au',
  nz: 'nz',
};

/** Stable hash of a session string -> a sticky port in 10000-19999. */
function stickyPort(session: string): number {
  let h = 0;
  for (let i = 0; i < session.length; i++)
    h = (h * 31 + session.charCodeAt(i)) >>> 0;
  return 10000 + (h % 10000);
}

/**
 * Build a DataImpulse ProxyAgent for a fetch `dispatcher`. The name is kept
 * from the previous provider so the ten adapters don't need touching.
 */
export function scraperDispatcher(
  opts: { country?: string; session?: string } = {},
): ProxyAgent | undefined {
  if (!HOST)
    return undefined;
  const cc = opts.country ? (COUNTRY[opts.country] ?? opts.country) : undefined;
  // Sticky by username (if PROXY_SESSION_FLAG set) keeps the base port;
  // otherwise sticky is done by connecting through a per-session port.
  const usernameSticky = opts.session && SID_FLAG;
  let username = USER;
  if (cc)
    username += CC_FLAG.replace('{cc}', cc);
  if (usernameSticky)
    username += SID_FLAG.replace('{id}', opts.session as string);
  const port = (opts.session && !SID_FLAG) ? String(stickyPort(opts.session)) : PORT;
  const token = `Basic ${Buffer.from(`${username}:${PASS}`).toString('base64')}`;
  return new ProxyAgent({
    uri: `http://${HOST}:${port}`,
    token,
  });
}

/**
 * Retry helper for proxied fetches. Residential pools occasionally return a
 * transient failure (timeout, 5xx, an odd 403 from one exit IP) — a second
 * attempt on a fresh connection usually lands. 1s/2s backoff between attempts.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    }
    catch (err) {
      lastErr = err;
      if (attempt < attempts)
        await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastErr;
}
