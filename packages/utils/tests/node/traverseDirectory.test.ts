import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

import { SeedcordErrorCode } from '@seedcord/errors';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { readFiles, traverseDirectory } from '#src/node/directory/readers';
import { setDevFiles } from '#src/node/directory/slots';

const FIXTURES = path.join(import.meta.dirname, 'fixtures');
const scratch = await mkdtemp(path.join(os.tmpdir(), 'seedcord-traverse-'));

async function rejection(walk: AsyncIterable<unknown>): Promise<unknown> {
    try {
        for await (const _ of walk);
        return null;
    } catch (caught) {
        return caught;
    }
}

afterAll(async () => {
    await rm(scratch, { recursive: true, force: true });
});

describe('traverseDirectory', () => {
    it('visits every ts file under the directory, sorted by path', async () => {
        const seen: string[] = [];

        for await (const { fullPath } of traverseDirectory(path.join(FIXTURES, 'walk'))) {
            seen.push(path.relative(FIXTURES, fullPath));
        }

        expect(seen).toEqual([
            path.join('walk', 'aGood.ts'),
            path.join('walk', 'b', 'bGood.ts'),
            path.join('walk', 'cGood.ts')
        ]);
    });

    it('skips hidden files and folders, the same as a built bot', async () => {
        const dir = path.join(scratch, 'hidden');
        await mkdir(path.join(dir, '.drafts'), { recursive: true });
        await writeFile(path.join(dir, 'Visible.ts'), 'export {};\n');
        await writeFile(path.join(dir, '.Hidden.ts'), 'export {};\n');
        await writeFile(path.join(dir, '.drafts', 'Draft.ts'), 'export {};\n');
        const seen: string[] = [];

        for await (const { fullPath } of traverseDirectory(dir)) seen.push(path.relative(dir, fullPath));

        expect(seen).toEqual(['Visible.ts']);
    });

    it('imports every code extension and skips type declarations and commonjs', async () => {
        const dir = path.join(scratch, 'extensions');
        await mkdir(dir, { recursive: true });
        const files = ['A.ts', 'B.tsx', 'C.mts', 'D.js', 'E.jsx', 'F.mjs', 'G.cjs', 'H.cts', 'I.d.ts', 'J.d.mts'];
        await Promise.all(files.map((file) => writeFile(path.join(dir, file), 'export {};\n')));
        const seen: string[] = [];

        for await (const { fullPath } of traverseDirectory(dir)) seen.push(path.relative(dir, fullPath));

        expect(seen).toEqual(['A.ts', 'B.tsx', 'C.mts', 'D.js', 'E.jsx', 'F.mjs']);
    });

    it('reports the file whose module failed to import, keeping the original as the cause', async () => {
        const error = await rejection(traverseDirectory(path.join(FIXTURES, 'broken')));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreImportFailed });
        expect(Error.isError(error) ? error.message : '').toMatch(/Broken\.ts/);
        expect(Error.isError(error) ? error.cause : undefined).toBeInstanceOf(Error);
    });

    it('reports the directory it could not read, keeping the original as the cause', async () => {
        const missing = path.join(FIXTURES, 'not-a-real-dir');

        const error = await rejection(traverseDirectory(missing));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CorePathUnreadable });
        expect(Error.isError(error) ? error.message : '').toMatch(/not-a-real-dir/);
        expect(Error.isError(error) ? error.cause : undefined).toBeInstanceOf(Error);
    });
});

describe('a module that fails to load through a Vite plugin', () => {
    const IMPORT_FAILED = pathToFileURL(path.join(import.meta.dirname, '../../src/node/importFailed.ts')).href;

    async function folderThrowing(name: string, thrown: string): Promise<string> {
        const dir = path.join(scratch, name);
        await mkdir(dir, { recursive: true });
        await writeFile(
            path.join(dir, 'Shop.ts'),
            `import { recordThrownBy } from ${JSON.stringify(IMPORT_FAILED)};\nthrow ${thrown};\n`
        );
        return dir;
    }

    it('throws CoreVitePluginThrew for an error a plugin from vitePlugins threw', async () => {
        const thrownBy = {
            plugin: 'shop-loader',
            hook: 'load',
            configFile: '/bot/seedcord.config.ts',
            moduleId: '/bot/shop.yaml'
        };
        const thrown = `recordThrownBy(new Error('bad yaml on line 3'), ${JSON.stringify(thrownBy)})`;

        const error = await rejection(traverseDirectory(await folderThrowing('from-plugin', thrown)));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreVitePluginThrew });
        const message = stripVTControlCharacters(Error.isError(error) ? error.message : '');
        expect(message).toContain('shop-loader');
        expect(message).toContain('its load hook while loading');
        expect(message).toContain('bad yaml on line 3');
    });

    it("keeps CoreImportFailed for an error from the bot's own code", async () => {
        const thrown = `new Error('Unexpected token')`;

        const error = await rejection(traverseDirectory(await folderThrowing('from-vite', thrown)));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreImportFailed });
    });
});

describe('a folder on disk under seedcord dev', () => {
    beforeEach(() => {
        const dev = setDevFiles({ root: FIXTURES, listed: ['/text'] });
        return () => dev[Symbol.dispose]();
    });

    it('resolves against root for traverseDirectory', async () => {
        const seen: string[] = [];

        for await (const { fullPath } of traverseDirectory('./walk/b')) seen.push(fullPath);

        expect(seen).toEqual([path.join(FIXTURES, 'walk', 'b', 'bGood.ts')]);
    });

    it('reads a subfolder of a folder that files lists', async () => {
        const seen: string[] = [];

        for await (const { fullPath } of readFiles('./text/nested')) seen.push(fullPath);

        expect(seen).toEqual([path.join(FIXTURES, 'text', 'nested', 'faq.md')]);
    });

    it('throws CoreDirectoryNotListed for a folder files leaves out', async () => {
        const error = await rejection(readFiles('./walk'));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryNotListed });
    });

    it('throws CorePathOutsideRoot when traverseDirectory walks a folder outside root', async () => {
        const error = await rejection(traverseDirectory(path.join(scratch, 'extensions')));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CorePathOutsideRoot });
    });

    it('throws CorePathOutsideRoot for a folder outside root', async () => {
        const error = await rejection(readFiles(scratch));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CorePathOutsideRoot });
    });
});

describe('a relative folder with no root', () => {
    it('throws for traverseDirectory with the path it was given', async () => {
        const error = await rejection(traverseDirectory('./walk'));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryRootUnknown });
        expect(Error.isError(error) ? error.message : '').toContain('./walk');
    });

    it('throws for readFiles', async () => {
        const error = await rejection(readFiles('./text'));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryRootUnknown });
    });
});

describe('readFiles', () => {
    it('reads every file under the directory except code, type, source map, and hidden files or folders', async () => {
        const seen: [string, string][] = [];

        for await (const { fullPath, bytes } of readFiles(path.join(FIXTURES, 'text'))) {
            seen.push([path.relative(FIXTURES, fullPath), bytes.toString()]);
        }

        expect(seen).toEqual([
            [path.join('text', 'en.json'), '{ "hi": "hello" }\n'],
            [path.join('text', 'nested', 'faq.md'), '# faq\n']
        ]);
    });

    it('skips every code extension', async () => {
        const dir = path.join(scratch, 'text-beside-code');
        await mkdir(dir, { recursive: true });
        const files = ['en.json', 'B.tsx', 'C.mts', 'E.jsx', 'F.mjs', 'J.d.mts'];
        await Promise.all(files.map((file) => writeFile(path.join(dir, file), '{}\n')));
        const seen: string[] = [];

        for await (const { fullPath } of readFiles(dir)) seen.push(path.relative(dir, fullPath));

        expect(seen).toEqual(['en.json']);
    });

    it('reads a binary file byte for byte', async () => {
        const dir = path.join(scratch, 'binary');
        await mkdir(dir, { recursive: true });
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);
        await writeFile(path.join(dir, 'dot.png'), png);
        const seen: Buffer[] = [];

        for await (const { bytes } of readFiles(dir)) seen.push(bytes);

        expect(seen).toEqual([png]);
    });

    it('reports the directory it could not read, keeping the original as the cause', async () => {
        const error = await rejection(readFiles(path.join(FIXTURES, 'not-a-real-dir')));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CorePathUnreadable });
        expect(Error.isError(error) ? error.cause : undefined).toBeInstanceOf(Error);
    });
});
