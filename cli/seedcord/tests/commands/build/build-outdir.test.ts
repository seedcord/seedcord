import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { BUILT_FILES_KEY } from '@seedcord/utils/node/internal';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { silentSteps } from '#tests/silentSteps';

let projectDir: string;

beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'seedcord-outdir-'));
    await mkdir(join(projectDir, 'src/handlers'), { recursive: true });
    await writeFile(join(projectDir, 'src/index.ts'), '');
    await writeFile(join(projectDir, 'src/bot.ts'), '');
    await writeFile(join(projectDir, 'src/handlers/Ping.ts'), '');
});

afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
});

async function buildWithOutDir(outDir: string): Promise<unknown> {
    const config = { root: './src', instance: './bot.ts', entry: './index.ts', build: { outDir } };
    await writeFile(join(projectDir, 'seedcord.config.ts'), `export default ${JSON.stringify(config)};\n`);
    return BuildRunner.create(silentSteps)
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
        await writeFile(join(projectDir, 'src/index.mjs'), `// ${BUILT_FILES_KEY}\n`);
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
