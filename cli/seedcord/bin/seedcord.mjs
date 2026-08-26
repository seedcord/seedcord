#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

function declaredNodeRange() {
    try {
        const pkg = JSON.parse(readFileSync(resolve(here, '../package.json'), 'utf8'));
        return pkg.engines?.node ?? '';
    } catch {
        return '';
    }
}

// importing core's own check here would load the code this guards
function unsupportedNodeRange() {
    const range = declaredNodeRange();

    const required = new RegExp(String.raw`^>=(\d+)(?:\.(\d+))?`).exec(range.replaceAll(/\s/g, ''));
    const current = /^v?(\d+)\.(\d+)/.exec(process.version);
    if (!required || !current) return null;

    const requiredMinor = required[2] ?? '0';
    const meets =
        Number(current[1]) > Number(required[1]) ||
        (Number(current[1]) === Number(required[1]) && Number(current[2]) >= Number(requiredMinor));
    return meets ? null : range;
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

const unsupported = unsupportedNodeRange();
if (unsupported) {
    // eslint-disable-next-line no-console -- the bin has no logger
    console.error(`seedcord requires Node ${unsupported} and this process runs ${process.version}.`);
    process.exit(1);
}

run().catch((error) => {
    // eslint-disable-next-line no-console -- the bin has no logger
    console.error(error);
    process.exitCode = 1;
});
