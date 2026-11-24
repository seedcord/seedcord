import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { satisfies } from 'verkit';
import { describe, expect, it } from 'vite-plus/test';

import { importFromCloudflarePlugin } from '#core/modules/cloudflarePlugin';

const CLI_ROOT = join(import.meta.dirname, '../../..');

interface Manifest {
    version?: string;
    dependencies?: Record<string, string>;
    bundledVersions?: Record<string, string>;
}

function manifest(packageJson: string): Manifest {
    // justified: this fits any package.json because every field is optional
    return JSON.parse(readFileSync(packageJson, 'utf8')) as Manifest;
}

function dependencies(packageJson: string): Record<string, string> {
    return manifest(packageJson).dependencies ?? {};
}

describe("the cloudflare plugin's dependencies", () => {
    it('loads a package that only the plugin depends on', async () => {
        const miniflare = await importFromCloudflarePlugin<{ Miniflare: unknown }>('miniflare');

        expect(miniflare.Miniflare).toBeTypeOf('function');
    });

    // the CLI takes its types from its own copy and runs the plugin's copy
    it.each(['@cloudflare/config', '@cloudflare/build-output-utils'])(
        'installs the %s version that @cloudflare/vite-plugin depends on',
        (name) => {
            const plugin = dependencies(join(CLI_ROOT, 'node_modules/@cloudflare/vite-plugin/package.json'));

            expect(manifest(join(CLI_ROOT, 'node_modules', name, 'package.json')).version).toBe(plugin[name]);
        }
    );
});

describe('rolldown pin', () => {
    // our range has to include the version vite runs because the dts plugin imports rolldown on its own.
    // vite in this repo is vite-plus-core, which ships rolldown inside and lists its version in bundledVersions
    it('accepts the rolldown version vite bundles', () => {
        const bundled = manifest(join(CLI_ROOT, 'node_modules/vite/package.json')).bundledVersions?.rolldown;
        const range = dependencies(join(CLI_ROOT, 'package.json')).rolldown;

        expect(range && bundled && satisfies(bundled, range), `rolldown ${bundled} against ${range}`).toBe(true);
    });
});
