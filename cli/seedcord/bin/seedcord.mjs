#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

function declaredEngines() {
    try {
        const pkg = JSON.parse(readFileSync(resolve(here, '../package.json'), 'utf8'));
        return pkg.engines ?? {};
    } catch {
        return {};
    }
}

function versionParts(text) {
    const [release = ''] = text.split(/[-+]/);
    const parts = release.split('.').map(Number);
    return parts.every(Number.isInteger) ? parts : null;
}

function meetsRange(range, version) {
    const compact = range.replaceAll(/\s/g, '');
    if (!compact.startsWith('>=')) return true;

    const need = versionParts(compact.slice('>='.length));
    const have = versionParts(version.replace(/^v/, ''));
    if (!need || !have) return true;

    for (const [index, wanted] of need.entries()) {
        const got = have[index] ?? 0;
        if (got !== wanted) return got > wanted;
    }
    return true;
}

// importing core's own check here would load the code this guards
function unsupportedRuntime() {
    const engines = declaredEngines();
    const bun = process.versions.bun;
    const runtime =
        bun === undefined
            ? { name: 'Node', range: engines.node ?? '', version: process.version }
            : { name: 'Bun', range: engines.bun ?? '', version: bun };

    return meetsRange(runtime.range, runtime.version) ? null : runtime;
}

async function run() {
    const distEntry = resolve(here, '../dist/cli.mjs');
    if (existsSync(distEntry)) {
        await import(pathToFileURL(distEntry).href);
        return;
    }

    const srcEntry = resolve(here, '../src/cli.ts');
    await import('tsx/esm/api');
    await import(pathToFileURL(srcEntry).href);
}

const unsupported = unsupportedRuntime();
if (unsupported) {
    // eslint-disable-next-line no-console -- the bin has no logger
    console.error(
        `seedcord requires ${unsupported.name} ${unsupported.range} but this process runs ${unsupported.version}.`
    );
    process.exit(1);
}

run().catch((error) => {
    // eslint-disable-next-line no-console -- the bin has no logger
    console.error(error);
    process.exitCode = 1;
});
