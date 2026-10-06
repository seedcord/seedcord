import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { silentLogger } from '#tests/silentLogger';

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
    return BuildRunner.create(silentLogger)
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
});
