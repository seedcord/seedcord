import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

import { readTextFiles, setBotRoot, traverseDirectory } from '#src/node/directory';

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

describe('a relative folder on disk', () => {
    beforeEach(() => setBotRoot(FIXTURES));
    afterEach(() => setBotRoot(undefined));

    it('resolves against root for traverseDirectory', async () => {
        const seen: string[] = [];

        for await (const { fullPath } of traverseDirectory('./walk/b')) seen.push(fullPath);

        expect(seen).toEqual([path.join(FIXTURES, 'walk', 'b', 'bGood.ts')]);
    });
});

describe('a relative folder with no root', () => {
    it('throws for traverseDirectory with the path it was given', async () => {
        const error = await rejection(traverseDirectory('./walk'));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryRootUnknown });
        expect(Error.isError(error) ? error.message : '').toContain('./walk');
    });

    it('throws for readTextFiles', async () => {
        const error = await rejection(readTextFiles('./text'));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryRootUnknown });
    });
});

describe('readTextFiles', () => {
    it('reads every file under the directory except code, type, source map, and hidden files or folders', async () => {
        const seen: [string, string][] = [];

        for await (const { fullPath, text } of readTextFiles(path.join(FIXTURES, 'text'))) {
            seen.push([path.relative(FIXTURES, fullPath), text]);
        }

        expect(seen).toEqual([
            [path.join('text', 'en.json'), '{ "hi": "hello" }\n'],
            [path.join('text', 'nested', 'faq.md'), '# faq\n']
        ]);
    });

    it('reports the directory it could not read, keeping the original as the cause', async () => {
        const error = await rejection(readTextFiles(path.join(FIXTURES, 'not-a-real-dir')));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CorePathUnreadable });
        expect(Error.isError(error) ? error.cause : undefined).toBeInstanceOf(Error);
    });
});
