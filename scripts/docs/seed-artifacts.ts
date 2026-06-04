/* eslint-disable no-console -- CLI script so console is ok */
import { existsSync } from 'node:fs';
import path from 'node:path';

import { cacheControlFor, createR2Client, listFiles, putToR2, r2ConfigFromEnv, servedFiles } from './artifacts-repo';

// Seeds the local docs tree (generated/artifacts/) to R2. Build it first with `pnpm docs:local`.

const INIT_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();
const ARTIFACTS_ROOT = path.resolve(INIT_CWD, 'generated', 'artifacts');

interface Options {
    bucket: string | undefined;
    dryRun: boolean;
}

function parseArgs(argv: readonly string[]): Options {
    const bucketIndex = argv.indexOf('--bucket');
    const bucket = bucketIndex >= 0 ? argv[bucketIndex + 1] : undefined;
    if (bucketIndex >= 0 && (bucket === undefined || bucket.startsWith('--'))) {
        throw new Error('--bucket requires a value (e.g. --bucket seedcord-docs-artifacts)');
    }
    return { bucket, dryRun: argv.includes('--dry-run') };
}

async function main(): Promise<void> {
    const options = parseArgs(process.argv.slice(2));

    if (!existsSync(path.join(ARTIFACTS_ROOT, 'index.json'))) {
        throw new Error(`No artifacts found at ${ARTIFACTS_ROOT}. Run "pnpm docs:local" first.`);
    }

    const served = servedFiles(await listFiles(ARTIFACTS_ROOT));

    if (options.dryRun) {
        console.log(`[dry-run] would put ${String(served.length)} file(s) to R2:`);
        for (const file of served) console.log(`  ${file}  (cache-control: ${cacheControlFor(file)})`);
        return;
    }

    const config = r2ConfigFromEnv(options.bucket);
    const client = createR2Client(config);

    for (const file of served) {
        await putToR2({
            client,
            bucket: config.bucket,
            key: file,
            filePath: path.join(ARTIFACTS_ROOT, file),
            cacheControl: cacheControlFor(file)
        });
    }

    console.log(`✅ put ${String(served.length)} file(s) to R2 bucket "${config.bucket}"`);
    console.log(`\nTest the live fetch with:\n  pnpm -C apps/docs dev:published`);
}

main().catch((error: unknown) => {
    console.error('\n❌ seed-artifacts.ts encountered an error:\n');
    console.error(error);
    process.exitCode = 1;
});
