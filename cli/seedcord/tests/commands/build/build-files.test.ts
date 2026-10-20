import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { quickBuildRunner } from './quickBuildRunner';

interface ProjectShape {
    root?: string;
    files?: string[];
    // paths relative to the project folder
    write?: string[];
}

interface Project extends AsyncDisposable {
    path: string;
}

async function project({ root = './src', files = [], write = [] }: ProjectShape): Promise<Project> {
    await using stack = new AsyncDisposableStack();
    const tmp = stack.use(await mkdtempDisposable(join(tmpdir(), 'seedcord-files-')));
    const rootDir = join(tmp.path, root);
    await mkdir(rootDir, { recursive: true });
    await writeFile(join(rootDir, 'bot.ts'), '');
    for (const path of write) {
        await mkdir(join(tmp.path, path, '..'), { recursive: true });
        await writeFile(join(tmp.path, path), 'export {};\n');
    }
    const config = { root, instance: './bot.ts', files };
    await writeFile(join(tmp.path, 'seedcord.config.ts'), `export default ${JSON.stringify(config)};\n`);
    const cleanup = stack.move();
    return { path: tmp.path, [Symbol.asyncDispose]: () => cleanup.disposeAsync() };
}

function buildOf(projectDir: string): Promise<unknown> {
    return quickBuildRunner()
        .run(projectDir)
        .then(
            () => null,
            (caught: unknown) => caught
        );
}

describe('seedcord build with files in the config', () => {
    it.each([
        ['does not exist', { files: ['./locales'] }, 'does not exist'],
        ['is a file', { files: ['./bot.ts'] }, 'is a file']
    ])('throws CliListedFolderUnusable for a listed folder that %s', async (_, shape, says) => {
        await using bot = await project(shape);

        const error = await buildOf(bot.path);

        expect(error).toMatchObject({
            code: SeedcordErrorCode.CliListedFolderUnusable,
            message: expect.stringContaining(says) as string
        });
    });

    it.each([
        ['is a dot-folder', { files: ['./.data'], write: ['src/.data/x.json'] }],
        ['is the project logs folder', { root: '.', files: ['./logs'], write: ['logs/x.json'] }]
    ])('throws CoreDirectorySkipped for a listed folder that %s', async (_, shape) => {
        await using bot = await project(shape);

        await expect(buildOf(bot.path)).resolves.toMatchObject({ code: SeedcordErrorCode.CoreDirectorySkipped });
    });

    it('throws CoreDuplicateName for two handlers that build to one file', async () => {
        await using bot = await project({ write: ['src/handlers/Roll.ts', 'src/handlers/Roll.tsx'] });

        const error = await buildOf(bot.path);

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDuplicateName });
        expect(Error.isError(error) ? error.message : '').toMatch(/Roll\.ts[\s\S]*Roll\.tsx[\s\S]*Roll\.js/);
    });
});
