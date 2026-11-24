#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { checkRuntime } from '@seedcord/core/internal/runtime';

const here = dirname(fileURLToPath(import.meta.url));

async function run() {
    const distEntry = resolve(here, '../dist/cli.mjs');
    if (existsSync(distEntry)) {
        await import(pathToFileURL(distEntry).href);
        return;
    }

    // eslint-disable-next-line no-console -- the bin has no logger
    console.error("seedcord isn't built. Run `vp run build` from the repo root.");
    process.exit(1);
}

const runtime = checkRuntime();
if (runtime.status === 'unsupported') {
    // eslint-disable-next-line no-console -- the bin has no logger
    console.error(`seedcord requires ${runtime.name} ${runtime.range} but this process runs ${runtime.running}.`);
    process.exit(1);
}

run().catch((error) => {
    // eslint-disable-next-line no-console -- the bin has no logger
    console.error(error);
    process.exitCode = 1;
});
