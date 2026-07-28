/**
 * Proxy smoke test — confirms the configured residential proxy actually
 * works, exits in the right country, and holds a sticky session, WITHOUT
 * running the full offers fetch.
 *
 * Run from the backend folder:
 *   npx tsx scripts/proxy-check.ts
 *
 * It uses the same country spellings the retailer adapters use, so it also
 * proves the uk→gb / eu→ie translation in proxy.ts is doing its job.
 * Costs a few kilobytes of traffic.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env');
let envText: string;
try {
  envText = readFileSync(envPath, 'utf8');
}
catch {
  console.error(`Could not read ${envPath} — run this from the backend folder.`);
  process.exit(1);
}
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && process.env[m[1]] === undefined)
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

/** What each adapter asks for → what we expect the exit IP to be. */
const CASES: Array<{ asks: string; expect: string; used_by: string }> = [
  { asks: 'uk', expect: 'GB', used_by: 'Tesco, Sainsbury\'s, Morrisons' },
  { asks: 'eu', expect: 'IE', used_by: 'Aldi IE, Tesco IE' },
  { asks: 'au', expect: 'AU', used_by: 'Woolworths AU' },
  { asks: 'nz', expect: 'NZ', used_by: 'Woolworths NZ' },
];

/**
 * Two independent IP-echo services. These are free endpoints that rate-limit
 * (429) under a burst, and a burst is exactly what this script does — so a
 * failure from one is almost never a proxy fault. Try each in turn, and only
 * report a problem if both refuse.
 */
const ECHO_SERVICES = [
  { url: 'http://ip-api.com/json', ip: 'query', country: 'countryCode' },
  { url: 'https://ipinfo.io/json', ip: 'ip', country: 'country' },
];

async function exitIp(dispatcher: unknown): Promise<{ ip: string; country: string }> {
  let lastErr = 'no attempt';
  for (const svc of ECHO_SERVICES) {
    try {
      const res = await fetch(svc.url, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatcher: dispatcher as any,
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      if (!res.ok) {
        lastErr = `HTTP ${res.status} from ${new URL(svc.url).host}`;
        continue;
      }
      const json = await res.json() as Record<string, string>;
      return { ip: json[svc.ip] ?? '?', country: (json[svc.country] ?? '?').toUpperCase() };
    }
    catch (err) {
      lastErr = `${(err as Error).message} (${new URL(svc.url).host})`;
    }
  }
  throw new Error(`${lastErr} — both IP-echo services refused, likely their rate limit rather than the proxy`);
}

/** Small pause so the free echo services don't rate-limit the burst. */
const pause = () => new Promise(r => setTimeout(r, 1500));

async function main() {
  const { scraperDispatcher, proxyMode } = await import('../functions/fetch-offers/proxy');

  const mode = proxyMode();
  console.log(`Proxy mode: ${mode}\n`);
  if (mode === 'direct') {
    console.error('No proxy configured — set PROXY_HOST / PROXY_PORT / PROXY_USERNAME / PROXY_PASSWORD in backend/.env');
    process.exit(1);
  }

  let failures = 0;

  for (const c of CASES) {
    await pause();
    process.stdout.write(`  ${c.asks.padEnd(3)} → expect ${c.expect}  `);
    try {
      const { ip, country } = await exitIp(scraperDispatcher({ country: c.asks }));
      const ok = country.toUpperCase() === c.expect;
      console.log(`${ok ? 'OK  ' : 'WRONG'} got ${country} (${ip})  — ${c.used_by}`);
      if (!ok)
        failures++;
    }
    catch (err) {
      console.log(`FAILED — ${(err as Error).message}  — ${c.used_by}`);
      failures++;
    }
  }

  // Sticky session: Woolworths AU needs the same exit IP for GET-cookies
  // then POST, so two calls sharing a session must land on the same IP.
  process.stdout.write('\n  sticky session (needed by Woolworths AU)  ');
  try {
    const session = 'mc-check-1';
    await pause();
    const a = await exitIp(scraperDispatcher({ country: 'au', session }));
    await pause();
    const b = await exitIp(scraperDispatcher({ country: 'au', session }));
    if (a.ip === b.ip) {
      console.log(`OK — both calls exited ${a.ip}`);
    }
    else {
      console.log(`NOT STICKY — ${a.ip} then ${b.ip}`);
      console.log('    Check PROXY_SESSION_FLAG matches your provider\'s syntax.');
      failures++;
    }
  }
  catch (err) {
    console.log(`FAILED — ${(err as Error).message}`);
    failures++;
  }

  console.log(failures === 0
    ? '\nAll good — safe to deploy.'
    : `\n${failures} problem(s). Fix before the Monday cron relies on it.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
