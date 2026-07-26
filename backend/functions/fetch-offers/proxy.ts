/**
 * ScraperAPI egress — routes a fetch through ScraperAPI's proxy so the request
 * leaves from a residential IP instead of the AWS datacenter range that
 * Aldi IE / Woolworths AU / Woolworths NZ block. Aldi UK works direct and is
 * NOT proxied.
 *
 * Proxy mode (vs API mode) is used deliberately: our adapters already build
 * the exact right requests (GET, POST, custom headers, cookies), and proxy
 * mode forwards them unchanged — we only swap the exit IP. Options travel in
 * the proxy username, dot-separated (ScraperAPI convention):
 *   - premium=true      → residential IPs (datacenter IPs get re-blocked)
 *   - country_code=xx   → exit from that country (Woolworths geo-restricts)
 *   - session_number=n  → pin the same exit IP across a multi-step flow
 *                          (needed for Woolworths AU: GET cookies → POST)
 *
 * TWO non-obvious requirements for ScraperAPI proxy mode:
 *   1. requestTls.rejectUnauthorized = false — ScraperAPI terminates TLS with
 *      its OWN certificate (it intercepts HTTPS), so verifying the origin cert
 *      fails with a bare "fetch failed". Disabling verification on the
 *      tunnelled connection is expected and required for this provider.
 *   2. Proxy-Authorization set explicitly as a Basic token, rather than relying
 *      on userinfo in the URI being parsed (undici doesn't always).
 *
 * If SCRAPERAPI_KEY is unset the helper returns undefined and fetch falls back
 * to a direct connection — so local dev (residential IP) works with no key.
 */

import { Buffer } from 'node:buffer';
import { ProxyAgent } from 'undici';

const KEY = process.env.SCRAPERAPI_KEY;
const ENDPOINT = 'http://proxy-server.scraperapi.com:8001';

export function scraperDispatcher(
  opts: { country?: string; session?: string } = {},
): ProxyAgent | undefined {
  if (!KEY)
    return undefined;
  const flags = ['scraperapi', 'premium=true'];
  if (opts.country)
    flags.push(`country_code=${opts.country}`);
  if (opts.session)
    flags.push(`session_number=${opts.session}`);
  const token = `Basic ${Buffer.from(`${flags.join('.')}:${KEY}`).toString('base64')}`;
  return new ProxyAgent({
    uri: ENDPOINT,
    token,
    requestTls: { rejectUnauthorized: false },
  });
}
