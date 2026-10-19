import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, onTestFinished } from 'vitest';

import { quickBuildRunner } from './quickBuildRunner';

async function projectListing(files: string[]): Promise<string> {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-files-'));
    onTestFinished(() => tmp.remove());
    await mkdir(join(tmp.path, 'src'));
    await writeFile(join(tmp.path, 'src/bot.ts'), '');
    const config = { root: './src', instance: './bot.ts', files };
    await writeFile(join(tmp.path, 'seedcord.config.ts'), `export default ${JSON.stringify(config)};\n`);
    return tmp.path;
}

describe('seedcord build with files in the config', () => {
    it('throws CorePathUnreadable for a listed folder that does not exist', async () => {
        const projectDir = await projectListing(['./locales']);

        await expect(quickBuildRunner().run(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CorePathUnreadable,
            message: expect.stringContaining('locales') as string
        });
    });

    it('throws CorePathUnreadable for a listed file', async () => {
        const projectDir = await projectListing(['./bot.ts']);

        await expect(quickBuildRunner().run(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CorePathUnreadable,
            message: expect.stringContaining('not a directory') as string
        });
    });
});
