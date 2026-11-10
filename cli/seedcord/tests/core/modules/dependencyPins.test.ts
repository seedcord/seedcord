import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { satisfies } from 'verkit';
import { describe, expect, it } from 'vite-plus/test';

const CLI_ROOT = join(import.meta.dirname, '../../..');

interface Manifest {
    dependencies: Record<string, string>;
    bundledVersions: Record<string, string>;
}

function manifest(packageJson: string): Manifest {
    // justified: every file read here is a package manifest
    return JSON.parse(readFileSync(packageJson, 'utf8')) as Manifest;
}

function dependencies(packageJson: string): Record<string, string> {
    return manifest(packageJson).dependencies;
}

describe('cloudflare pins', () => {
    // another version can parse cloudflare.config.ts or .cloudflare/output differently from the plugin's copy
    it.each(['@cloudflare/config', '@cloudflare/build-output-utils'])(
        'pins %s to the version @cloudflare/vite-plugin depends on',
        (name) => {
            const plugin = dependencies(join(CLI_ROOT, 'node_modules/@cloudflare/vite-plugin/package.json'));

            expect(dependencies(join(CLI_ROOT, 'package.json'))[name]).toBe(plugin[name]);
        }
    );
});

describe('rolldown pin', () => {
    // rolldown-plugin-dts imports rolldown itself. vite here is vite-plus-core, which bundles rolldown and lists its version
    it('accepts the rolldown version vite bundles', () => {
        const bundled = manifest(join(CLI_ROOT, 'node_modules/vite/package.json')).bundledVersions.rolldown;
        const range = dependencies(join(CLI_ROOT, 'package.json')).rolldown;

        expect(bundled !== undefined && range !== undefined && satisfies(bundled, range)).toBe(true);
    });
});
