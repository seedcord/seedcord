/* eslint-disable no-console -- CLI script so console is ok */
import { Converters, Envapter } from 'envapt';

import { buildPurgeBody } from './purge-args';

// Purges the Cloudflare edge cache for the docs CDN.
//
// Needs CLOUDFLARE_CACHE_PURGE_TOKEN (Zone -> Cache Purge) + CLOUDFLARE_ZONE_ID
//   pnpm docs:purge                     # purge everything on the zone
//   pnpm docs:purge --files <url...>    # purge specific full URLs
//   pnpm docs:purge --prefixes <p...>   # purge by URL prefix, host plus path, no scheme, max 30
//   pnpm docs:purge --dry-run           # print the request, but don't actually send it

const CF_API = 'https://api.cloudflare.com/client/v4';

function read(key: string): string {
    return Envapter.getUsing(key, { converter: Converters.String, required: true });
}

async function main(): Promise<void> {
    const argv = process.argv.slice(2);
    const dryRun = argv.includes('--dry-run');
    const token = read('CLOUDFLARE_CACHE_PURGE_TOKEN');
    const zoneId = read('CLOUDFLARE_ZONE_ID');

    const body = buildPurgeBody(argv);
    console.log(`${dryRun ? '[dry-run] would purge' : 'purging'}: ${JSON.stringify(body)}`);
    if (dryRun) return;

    const res = await fetch(`${CF_API}/zones/${zoneId}/purge_cache`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(body)
    });
    // justified: the Cloudflare REST response shape is external and untyped here.
    const result = (await res.json()) as { success?: boolean; errors?: unknown[] };
    if (!res.ok || result.success !== true) {
        throw new Error(`Cloudflare purge failed (HTTP ${String(res.status)}): ${JSON.stringify(result.errors)}`);
    }
    console.log('✅ Cloudflare cache purged');
}

main().catch((error: unknown) => {
    console.error('\n❌ purge-cdn-cache.ts failed:\n');
    console.error(error);
    process.exitCode = 1;
});
