import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { SeedcordErrorCode } from '@seedcord/errors';
import { afterAll, describe, expect, it } from 'vitest';

import { traverseDirectory } from '#src/node/directory';

const FIXTURES = path.join(import.meta.dirname, 'fixtures');
const SOURCE = path.join(import.meta.dirname, '..', '..', 'src', 'node', 'directory.ts');

const run = promisify(execFile);
const scratch = await mkdtemp(path.join(os.tmpdir(), 'seedcord-traverse-'));

async function rejection(walk: Promise<void>): Promise<unknown> {
    return walk.then(
        () => null,
        (caught: unknown) => caught
    );
}

// vitest's evaluator decodes a percent-encoded specifier back to a raw path
async function walkInNode(dir: string): Promise<string[]> {
    const script = [
        "import { pathToFileURL } from 'node:url';",
        "import path from 'node:path';",
        'const [source, target] = process.argv.slice(1);',
        'const { traverseDirectory } = await import(pathToFileURL(source).href);',
        'const seen = [];',
        'await traverseDirectory(target, (full) => void seen.push(path.basename(full)));',
        'console.log(JSON.stringify(seen));'
    ].join('\n');

    const { stdout } = await run(process.execPath, ['--import', 'tsx/esm', '-e', script, SOURCE, dir]);
    return JSON.parse(stdout) as string[];
}

afterAll(async () => {
    await rm(scratch, { recursive: true, force: true });
});

describe('traverseDirectory', () => {
    it('imports a file whose directory name holds a url-special character', async () => {
        // '?' reproduces the windows drive-letter failure on any platform
        const dir = path.join(scratch, 'query?segment');
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, 'package.json'), '{ "type": "module" }\n');
        await writeFile(path.join(dir, 'Mod.js'), 'export const ok = true;\n');

        await expect(walkInNode(dir)).resolves.toEqual(['Mod.js']);
    });

    it('visits every ts file under the directory', async () => {
        const seen: string[] = [];

        await traverseDirectory(path.join(FIXTURES, 'walk'), (fullPath) => void seen.push(path.basename(fullPath)));

        expect(seen.sort()).toEqual(['aGood.ts', 'cGood.ts']);
    });

    it('reports the file whose module failed to import, keeping the original as the cause', async () => {
        const error = await rejection(traverseDirectory(path.join(FIXTURES, 'broken'), () => undefined));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryImportFailed });
        expect(Error.isError(error) ? error.message : '').toMatch(/Broken\.ts/);
        expect(Error.isError(error) ? error.cause : undefined).toBeInstanceOf(Error);
    });

    it('reports the directory it could not read, keeping the original as the cause', async () => {
        const missing = path.join(FIXTURES, 'not-a-real-dir');

        const error = await rejection(traverseDirectory(missing, () => undefined));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryUnreadable });
        expect(Error.isError(error) ? error.message : '').toMatch(/not-a-real-dir/);
        expect(Error.isError(error) ? error.cause : undefined).toBeInstanceOf(Error);
    });
});
