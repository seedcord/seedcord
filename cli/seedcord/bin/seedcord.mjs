#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { isValid, isValidRange, satisfies } from 'verkit';

const here = dirname(fileURLToPath(import.meta.url));

function declaredEngines() {
    try {
        const pkg = JSON.parse(readFileSync(resolve(here, '../package.json'), 'utf8'));
        return pkg.engines ?? {};
    } catch {
        return {};
    }
}

// importing core's assertDeclaredRuntime here would load the code this guards
function unsupportedRuntime() {
    const engines = declaredEngines();
    const { bun, node } = process.versions;
    const runtime =
        bun === undefined
            ? { name: 'Node', range: engines.node ?? '', running: node }
            : { name: 'Bun', range: engines.bun ?? '', running: bun };

    if (
        !runtime.range ||
        !isValidRange(runtime.range) ||
        !isValid(runtime.running) ||
        satisfies(runtime.running, runtime.range, { includePrerelease: true })
    )
        return undefined;
    return runtime;
}

async function run() {
    const distEntry = resolve(here, '../dist/cli.mjs');
    if (existsSync(distEntry)) {
        await import(pathToFileURL(distEntry).href);
    }
}

const unsupported = unsupportedRuntime();
if (unsupported) {
    // eslint-disable-next-line no-console -- the bin has no logger
    console.error(
        `seedcord requires ${unsupported.name} ${unsupported.range} but this process runs ${unsupported.running}.`
    );
    process.exit(1);
}

run().catch((error) => {
    // eslint-disable-next-line no-console -- the bin has no logger
    console.error(error);
    process.exitCode = 1;
});
