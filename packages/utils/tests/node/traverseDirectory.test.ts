import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { SeedcordErrorCode } from '@seedcord/errors';
import { afterAll, describe, expect, it } from 'vitest';

import { readTextFiles, traverseDirectory } from '#src/node/directory';

const FIXTURES = path.join(import.meta.dirname, 'fixtures');
const SOURCE = path.join(import.meta.dirname, '..', '..', 'src', 'node', 'directory.ts');

const run = promisify(execFile);
const scratch = await mkdtemp(path.join(os.tmpdir(), 'seedcord-traverse-'));

async function rejection(walk: AsyncIterable<unknown>): Promise<unknown> {
    try {
        for await (const _ of walk);
        return null;
    } catch (caught) {
        return caught;
    }
}

// vitest's evaluator decodes a percent-encoded specifier back to a raw path
async function walkInNode(dir: string): Promise<string[]> {
    const script = [
        "import { pathToFileURL } from 'node:url';",
        "import path from 'node:path';",
        'const [source, target] = process.argv.slice(1);',
        'const { traverseDirectory } = await import(pathToFileURL(source).href);',
        'const seen = [];',
        'for await (const { fullPath } of traverseDirectory(target)) seen.push(path.basename(fullPath));',
        'console.log(JSON.stringify(seen));'
    ].join('\n');

    const { stdout } = await run(process.execPath, ['--import', 'tsx/esm', '-e', script, SOURCE, dir]);
    // justified: the script above only prints basenames
    return JSON.parse(stdout) as string[];
}

afterAll(async () => {
    await rm(scratch, { recursive: true, force: true });
});

describe('traverseDirectory', () => {
    it('imports a file whose directory name holds a url-special character', async () => {
        // this name must break a raw import specifier and stay legal on windows
        const dir = path.join(scratch, 'hash#segment');
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, 'package.json'), '{ "type": "module" }\n');
        await writeFile(path.join(dir, 'Mod.js'), 'export const ok = true;\n');

        await expect(walkInNode(dir)).resolves.toEqual(['Mod.js']);
    });

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

    it('reports the file whose module failed to import, keeping the original as the cause', async () => {
        const error = await rejection(traverseDirectory(path.join(FIXTURES, 'broken')));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryImportFailed });
        expect(Error.isError(error) ? error.message : '').toMatch(/Broken\.ts/);
        expect(Error.isError(error) ? error.cause : undefined).toBeInstanceOf(Error);
    });

    it('reports the directory it could not read, keeping the original as the cause', async () => {
        const missing = path.join(FIXTURES, 'not-a-real-dir');

        const error = await rejection(traverseDirectory(missing));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryUnreadable });
        expect(Error.isError(error) ? error.message : '').toMatch(/not-a-real-dir/);
        expect(Error.isError(error) ? error.cause : undefined).toBeInstanceOf(Error);
    });
});

describe('readTextFiles', () => {
    it('reads every file under the directory except code files', async () => {
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

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryUnreadable });
        expect(Error.isError(error) ? error.cause : undefined).toBeInstanceOf(Error);
    });
});
