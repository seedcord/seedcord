/* eslint-disable no-console -- CLI script so console is ok */
import { Converters, Envapter } from 'envapt';

import { CdnPurge } from '#src/docs/CdnPurge';
import { CliFlags } from '#src/lib/CliFlags';

// Purges the Cloudflare edge cache for the docs CDN.
//
// Needs CLOUDFLARE_CACHE_PURGE_TOKEN (Zone -> Cache Purge) + CLOUDFLARE_ZONE_ID
//   pnpm docs:purge                                      # purge everything on the zone
//   pnpm docs:purge --files <url> --files <url>          # purge specific full URLs
//   pnpm docs:purge --prefixes <p> --prefixes <p>        # purge by URL prefix, host plus path, no scheme, max 30
//   pnpm docs:purge --dry-run                            # print the request, but don't actually send it

const flags = new CliFlags('pnpm docs:purge [options]', {
    prefixes: { type: 'string', multiple: true, describe: 'URL prefix to purge, repeat for several' },
    files: { type: 'string', multiple: true, describe: 'Full URL to purge, repeat for several' },
    'dry-run': { type: 'boolean', describe: 'Print the request and send nothing' }
});

const read = (key: string): string => Envapter.getRequired(key, Converters.String);

async function main(): Promise<void> {
    const argv = process.argv.slice(2);
    if (flags.wantsHelp(argv)) {
        console.log(flags.help());
        return;
    }

    const { prefixes, files, 'dry-run': dryRun } = flags.parse(argv);
    const body = CdnPurge.bodyFor({ prefixes, files });

    console.log(`${dryRun ? '[dry-run] would purge' : 'purging'}: ${JSON.stringify(body)}`);
    if (dryRun) return;

    await new CdnPurge(read('CLOUDFLARE_ZONE_ID'), read('CLOUDFLARE_CACHE_PURGE_TOKEN')).purge(body);
    console.log('✅ Cloudflare cache purged');
}

main().catch((error: unknown) => {
    console.error('\n❌ purge-cdn-cache.ts failed:\n');
    console.error(error);
    process.exitCode = 1;
});
