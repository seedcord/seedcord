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

function parseVersion(text) {
    const [withoutBuild = ''] = text.replace(/^v/, '').split('+');
    const [release = '', ...prerelease] = withoutBuild.split('-');
    const parts = release.split('.').map(Number);
    return parts.every(Number.isInteger) ? { parts, prerelease: prerelease.length > 0 } : undefined;
}

// semver ranks 1.4.2-canary.1 below 1.4.2
function meetsMinimum(required, running) {
    const length = Math.max(required.parts.length, running.parts.length);
    for (let index = 0; index < length; index++) {
        const wanted = required.parts[index] ?? 0;
        const got = running.parts[index] ?? 0;
        if (got !== wanted) return got > wanted;
    }
    return !running.prerelease;
}

// importing core's assertDeclaredRuntime here would load the code this guards
function unsupportedRuntime() {
    const engines = declaredEngines();
    const { bun, node } = process.versions;
    const runtime =
        bun === undefined
            ? { name: 'Node', range: engines.node ?? '', running: node }
            : { name: 'Bun', range: engines.bun ?? '', running: bun };

    const range = runtime.range.replaceAll(/\s/g, '');
    if (!range.startsWith('>=')) return undefined;

    const required = parseVersion(range.slice('>='.length));
    const running = parseVersion(runtime.running);
    if (!required || !running || meetsMinimum(required, running)) return undefined;
    return runtime;
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
        `seedcord requires ${unsupported.name} ${unsupported.range} but this process runs ${unsupported.running}.`
    );
    process.exit(1);
}

run().catch((error) => {
    // eslint-disable-next-line no-console -- the bin has no logger
    console.error(error);
    process.exitCode = 1;
});
