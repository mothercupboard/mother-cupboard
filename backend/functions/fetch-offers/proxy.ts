/**
 * Residential proxy egress — routes a fetch through a residential IP instead
 * of the AWS datacenter range that Aldi IE / Tesco / Woolworths AU / NZ block.
 * Aldi UK and Asda work direct and are NOT proxied.
 *
 * VENDOR-AGNOSTIC. Two modes, chosen by which env vars are set:
 *
 *   1. Generic residential proxy (PREFERRED — pay per GB).
 *      Set PROXY_HOST / PROXY_PORT / PROXY_USERNAME / PROXY_PASSWORD.
 *      Nearly every provider (DataImpulse, IPRoyal, Decodo, Webshare…) takes
 *      its options as dot/dash-separated flags appended to the username. The
 *      exact spelling differs per vendor, so the two fragments are templates:
 *
 *        PROXY_COUNTRY_FLAG   default "__cr.{country}"
 *        PROXY_SESSION_FLAG   default ";sessid.{session}"
 *
 *      Defaults follow DataImpulse's convention, e.g. "login__cr.au;sessid.123"
 *      pins an Australian exit IP labelled 123 for ~30 minutes (append
 *      ";sessttl.N" to set a different rotation interval in minutes). For
 *      IPRoyal you'd set "_country-{country}" and "_session-{session}";
 *      check your provider's docs and change the env vars — no code change.
 *
 *      A weekly run moves only tens of megabytes of JSON, so per-GB billing
 *      costs pennies where a scraping-API subscription costs tens of pounds.
 *
 *   2. ScraperAPI (LEGACY fallback). Used only when PROXY_HOST is unset and
 *      SCRAPERAPI_KEY is present, so the switchover is reversible: unset
 *      PROXY_HOST and the old path comes straight back.
 *
 * With neither configured the helper returns undefined and fetch falls back
 * to a direct connection — so local dev on a residential line needs no keys.
 *
 * TLS: a normal proxy tunnels HTTPS untouched (CONNECT), so certificates
 * verify normally and we leave verification ON. ScraperAPI is the odd one
 * out — it terminates TLS with its own certificate, which is why that path
 * disables verification. Set PROXY_INSECURE_TLS=true if a provider needs it.
 */

import { Buffer } from 'node:buffer';
import { ProxyAgent } from 'undici';

// ─── Generic residential proxy ────────────────────────────────────────────

// NOTE: `||` not `??` throughout — serverless passes unset variables through
// as EMPTY STRINGS, which `??` would happily accept, silently wiping the
// defaults (and with them, country targeting) once deployed.
const PROXY_HOST = process.env.PROXY_HOST || undefined;
const PROXY_PORT = process.env.PROXY_PORT || '823';
const PROXY_USERNAME = process.env.PROXY_USERNAME || undefined;
const PROXY_PASSWORD = process.env.PROXY_PASSWORD || undefined;
const COUNTRY_FLAG = process.env.PROXY_COUNTRY_FLAG || '__cr.{country}';
const SESSION_FLAG = process.env.PROXY_SESSION_FLAG || ';sessid.{session}';
const INSECURE_TLS = process.env.PROXY_INSECURE_TLS === 'true';

// ─── ScraperAPI (legacy) ──────────────────────────────────────────────────

const SCRAPER_KEY = process.env.SCRAPERAPI_KEY || undefined;
const SCRAPER_ENDPOINT = 'http://proxy-server.scraperapi.com:8001';

/**
 * The adapters ask for ScraperAPI's own country spellings. Real providers
 * want ISO 3166-1 alpha-2, so translate centrally rather than editing seven
 * call sites. Note "eu" becomes "ie": both retailers using it (Aldi IE,
 * Tesco IE) are Irish sites, so an Irish exit IP is what they actually want.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  uk: 'gb',
  eu: 'ie',
};

function isoCountry(country: string): string {
  return COUNTRY_ALIASES[country.toLowerCase()] ?? country.toLowerCase();
}

/**
 * Bumped by withRetry after every failed attempt, and mixed into the sticky
 * session label so a retry lands on a DIFFERENT exit IP.
 *
 * Adapters define their session id once at module scope, so without this a
 * retry would re-use the very IP that just failed — three attempts against a
 * blocked address, which is no retry at all (seen 28 Jul 2026: Sainsbury's
 * returned an identical 403 on all three). Within a single attempt the label
 * is stable, so multi-step flows that need one IP (Woolworths AU's
 * GET-cookies → POST) still hold together.
 */
let generation = 0;

/**
 * @param opts.via Force a specific egress instead of the default preference.
 *   Use `'scraperapi'` for retailers whose bot protection reads more than the
 *   exit IP — Aldi IE, Tesco IE and Sainsbury's all return 403 through a plain
 *   residential proxy but pass through ScraperAPI's premium mode, which also
 *   normalises the TLS/browser fingerprint (verified 28 July 2026: SuperValu,
 *   an Irish site on the same Irish IPs with the same headers, works fine —
 *   so it is the site's protection, not the country or the headers).
 *   Those three cost roughly 600 credits a month, inside ScraperAPI's free
 *   1,000, while the other five proxied retailers use cheap per-GB egress.
 */
export function scraperDispatcher(
  opts: { country?: string; session?: string; via?: 'scraperapi' | 'residential' } = {},
): ProxyAgent | undefined {
  const haveResidential = Boolean(PROXY_HOST && PROXY_USERNAME && PROXY_PASSWORD);

  if (opts.via === 'scraperapi')
    return SCRAPER_KEY ? scraperApiDispatcher(opts) : (haveResidential ? genericDispatcher(opts) : undefined);
  if (opts.via === 'residential')
    return haveResidential ? genericDispatcher(opts) : undefined;

  if (haveResidential)
    return genericDispatcher(opts);
  if (SCRAPER_KEY)
    return scraperApiDispatcher(opts);
  return undefined;
}

function genericDispatcher(opts: { country?: string; session?: string }): ProxyAgent {
  let username = PROXY_USERNAME!;
  if (opts.country)
    username += COUNTRY_FLAG.replace('{country}', isoCountry(opts.country));
  if (opts.session)
    username += SESSION_FLAG.replace('{session}', `${opts.session}-${generation}`);

  const token = `Basic ${Buffer.from(`${username}:${PROXY_PASSWORD}`).toString('base64')}`;
  return new ProxyAgent({
    uri: `http://${PROXY_HOST}:${PROXY_PORT}`,
    token,
    ...(INSECURE_TLS && { requestTls: { rejectUnauthorized: false } }),
  });
}

/**
 * Legacy ScraperAPI path. Options travel in the proxy username,
 * dot-separated: premium=true (residential IPs), country_code, session_number.
 * Proxy-Authorization is set explicitly as a Basic token because undici
 * doesn't always parse userinfo from the URI. TLS verification is disabled
 * because ScraperAPI intercepts HTTPS with its own certificate.
 */
function scraperApiDispatcher(opts: { country?: string; session?: string }): ProxyAgent {
  const flags = ['scraperapi', 'premium=true'];
  if (opts.country)
    flags.push(`country_code=${opts.country}`);
  if (opts.session)
    flags.push(`session_number=${opts.session}`);
  const token = `Basic ${Buffer.from(`${flags.join('.')}:${SCRAPER_KEY}`).toString('base64')}`;
  return new ProxyAgent({
    uri: SCRAPER_ENDPOINT,
    token,
    requestTls: { rejectUnauthorized: false },
  });
}

/** Which egress is active — logged at the start of a run for diagnosis. */
export function proxyMode(): 'residential' | 'scraperapi' | 'direct' {
  if (PROXY_HOST && PROXY_USERNAME && PROXY_PASSWORD)
    return 'residential';
  if (SCRAPER_KEY)
    return 'scraperapi';
  return 'direct';
}

/**
 * Retry helper for proxied fetches. Residential pools are occasionally slow
 * or drop a connection under load — seen live 27 Jul: NZ/AU timed out and
 * Tesco IE got three 500s on a run that succeeded end-to-end 20 minutes
 * earlier. A second attempt on a fresh proxy connection usually lands.
 * 1s/2s backoff between attempts.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    }
    catch (err) {
      lastErr = err;
      if (attempt < attempts) {
        // Move to a fresh exit IP before trying again — a blocked address
        // stays blocked no matter how long we wait.
        generation++;
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastErr;
}
