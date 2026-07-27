import path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { traverseDirectory } from '@src/node/directory';

const FIXTURES = path.join(import.meta.dirname, 'fixtures');

async function rejection(walk: Promise<void>): Promise<unknown> {
    return walk.then(
        () => null,
        (caught: unknown) => caught
    );
}

describe('traverseDirectory', () => {
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
