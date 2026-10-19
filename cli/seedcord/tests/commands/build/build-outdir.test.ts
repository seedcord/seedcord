import { existsSync } from 'node:fs';
import { mkdir, mkdtempDisposable, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { BOT_FILES_KEY } from '@seedcord/utils/internal';
import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';

import { quickBuildRunner } from './quickBuildRunner';

let projectDir: string;

beforeEach(async () => {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-outdir-'));
    projectDir = tmp.path;
    await mkdir(join(projectDir, 'src/handlers'), { recursive: true });
    await writeFile(join(projectDir, 'src/index.ts'), '');
    await writeFile(join(projectDir, 'src/bot.ts'), '');
    await writeFile(join(projectDir, 'src/handlers/Ping.ts'), '');
    return () => tmp.remove();
});

async function buildWithOutDir(outDir: string): Promise<unknown> {
    const config = { root: './src', instance: './bot.ts', build: { start: './index.ts', outDir } };
    await writeFile(join(projectDir, 'seedcord.config.ts'), `export default ${JSON.stringify(config)};\n`);
    return quickBuildRunner()
        .run(projectDir)
        .then(
            () => null,
            (caught: unknown) => caught
        );
}

describe('seedcord build checks outDir before it empties it', () => {
    it.each([['.'], ['./src'], ['..']])('throws for outDir %s, which holds root', async (outDir) => {
        await expect(buildWithOutDir(outDir)).resolves.toMatchObject({
            code: SeedcordErrorCode.CliConfigOutDirDeletesRoot
        });
        expect(existsSync(join(projectDir, 'src/handlers/Ping.ts'))).toBe(true);
    });

    it('throws for a non-empty outDir that no earlier build wrote', async () => {
        await expect(buildWithOutDir('./src/handlers')).resolves.toMatchObject({
            code: SeedcordErrorCode.CliBuildOutDirNotEmpty
        });
        expect(existsSync(join(projectDir, 'src/handlers/Ping.ts'))).toBe(true);
    });

    it('throws for an outDir that links to root', async () => {
        await writeFile(join(projectDir, 'src/index.mjs'), `// ${BOT_FILES_KEY}\n`);
        await symlink(join(projectDir, 'src'), join(projectDir, 'out'), 'junction');

        await expect(buildWithOutDir('./out')).resolves.toMatchObject({
            code: SeedcordErrorCode.CliConfigOutDirDeletesRoot
        });
        expect(existsSync(join(projectDir, 'src/handlers/Ping.ts'))).toBe(true);
    });

    it('throws for an outDir whose index.mjs some other tool wrote', async () => {
        await mkdir(join(projectDir, 'out'));
        await writeFile(join(projectDir, 'out/index.mjs'), "console.log('not a seedcord build');\n");
        await writeFile(join(projectDir, 'out/notes.txt'), 'keep me\n');

        await expect(buildWithOutDir('./out')).resolves.toMatchObject({
            code: SeedcordErrorCode.CliBuildOutDirNotEmpty
        });
        expect(existsSync(join(projectDir, 'out/notes.txt'))).toBe(true);
    });
});

describe('seedcord build checks the server entry', () => {
    const STARTED = 'seedcordTestPluginStarted';

    it('throws CliFileNotFound before any plugin from vitePlugins starts', async () => {
        onTestFinished(() => {
            Reflect.deleteProperty(globalThis, STARTED);
        });
        await writeFile(
            join(projectDir, 'seedcord.config.ts'),
            `export default { root: './src', instance: './bot.ts', build: { start: './missing.ts' }, vitePlugins: () => [{ name: 'marks-start', config: () => { globalThis.${STARTED} = true; } }] };\n`
        );

        await expect(quickBuildRunner().run(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliFileNotFound
        });
        expect(Reflect.get(globalThis, STARTED)).toBeUndefined();
    });
});
