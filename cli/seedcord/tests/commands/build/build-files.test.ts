import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, onTestFinished } from 'vitest';

import { quickBuildRunner } from './quickBuildRunner';

interface ProjectShape {
    root?: string;
    files?: string[];
    // paths relative to the project folder
    write?: string[];
}

async function project({ root = './src', files = [], write = [] }: ProjectShape): Promise<string> {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-files-'));
    onTestFinished(() => tmp.remove());
    const rootDir = join(tmp.path, root);
    await mkdir(rootDir, { recursive: true });
    await writeFile(join(rootDir, 'bot.ts'), '');
    for (const path of write) {
        await mkdir(join(tmp.path, path, '..'), { recursive: true });
        await writeFile(join(tmp.path, path), 'export {};\n');
    }
    const config = { root, instance: './bot.ts', files };
    await writeFile(join(tmp.path, 'seedcord.config.ts'), `export default ${JSON.stringify(config)};\n`);
    return tmp.path;
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
        ['is a file', { files: ['./bot.ts'] }, 'is a file'],
        ['is a dot-folder', { files: ['./.data'], write: ['src/.data/x.json'] }, 'build skips'],
        ['is the project logs folder', { root: '.', files: ['./logs'], write: ['logs/x.json'] }, 'build skips']
    ])('throws CliListedFolderUnusable for a listed folder that %s', async (_, shape, says) => {
        const error = await buildOf(await project(shape));

        expect(error).toMatchObject({
            code: SeedcordErrorCode.CliListedFolderUnusable,
            message: expect.stringContaining(says) as string
        });
    });

    it('throws CoreDuplicateName for two handlers that build to one file', async () => {
        const error = await buildOf(await project({ write: ['src/handlers/Roll.ts', 'src/handlers/Roll.tsx'] }));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDuplicateName });
        expect(Error.isError(error) ? error.message : '').toMatch(/Roll\.ts[\s\S]*Roll\.tsx[\s\S]*Roll\.js/);
    });
});
