import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveDocEntryPoints } from '../src/workspace';

import type { PackageManifest } from '../src/types';

let packageDir: string;

async function writeDeclaration(relative: string): Promise<void> {
    const full = join(packageDir, relative);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, 'export {};\n', 'utf8');
}

const manifestWith = (exports: PackageManifest['exports']): PackageManifest => ({
    name: '@seedcord/fixture',
    version: '0.0.0',
    ...(exports && { exports })
});

beforeEach(async () => {
    packageDir = await mkdtemp(join(tmpdir(), 'doc-entries-'));
});

afterEach(async () => {
    await rm(packageDir, { recursive: true, force: true });
});

describe('resolveDocEntryPoints', () => {
    it('names the package and the subpath when a declared entry is not built', async () => {
        const manifest = manifestWith({ '.': { import: { types: './dist/index.d.mts' } } });

        await expect(resolveDocEntryPoints(packageDir, manifest)).rejects.toThrow(
            /@seedcord\/fixture exports "\." as \.\/dist\/index\.d\.mts, which does not exist/
        );
    });

    // @seedcord/tsconfig ships json presets. resolving nothing has to stay a skip, never a throw.
    it('resolves nothing for a package whose every export declares no types', async () => {
        const manifest = manifestWith({
            '.': { default: './base.json' },
            './node': { default: './node.json' }
        });

        await expect(resolveDocEntryPoints(packageDir, manifest)).resolves.toEqual([]);
    });

    it('skips a subpath that declares no types', async () => {
        await writeDeclaration('dist/index.d.mts');
        const manifest = manifestWith({
            '.': { import: { types: './dist/index.d.mts' } },
            './base.json': './base.json'
        });

        const entries = await resolveDocEntryPoints(packageDir, manifest);

        expect(entries.map((entry) => entry.subpath)).toEqual(['.']);
    });

    it('pairs a subpath declaration with the src file tsdown built it from', async () => {
        await writeDeclaration('dist/hmr.index.d.mts');
        await writeDeclaration('src/hmr.index.ts');
        const manifest = manifestWith({ './hmr': { import: { types: './dist/hmr.index.d.mts' } } });

        const [entry] = await resolveDocEntryPoints(packageDir, manifest);

        expect(entry?.sourceEntry).toBe('src/hmr.index.ts');
    });

    it('sorts the root entry ahead of every subpath', async () => {
        await writeDeclaration('dist/index.d.mts');
        await writeDeclaration('dist/edge.d.mts');
        const manifest = manifestWith({
            './edge': { import: { types: './dist/edge.d.mts' } },
            '.': { import: { types: './dist/index.d.mts' } }
        });

        const entries = await resolveDocEntryPoints(packageDir, manifest);

        expect(entries.map((entry) => entry.subpath)).toEqual(['.', './edge']);
    });
});
