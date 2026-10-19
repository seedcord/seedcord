import { appendFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { ShellMode } from '#core/viteMode';

import { builtSource, copyFixture, FLAT_BOT, GATEWAY_BOT } from './fixtureCopy';
import { quickBuildRunner } from './quickBuildRunner';

describe('seedcord build mode on a node bot', () => {
    it('bundles in the mode the shell sets', async () => {
        const projectDir = await copyFixture(FLAT_BOT);
        await appendFile(join(projectDir, 'index.ts'), 'console.log(`fixture:mode ${import.meta.env.MODE}`);\n');

        await quickBuildRunner(undefined, new ShellMode({ key: 'ENV', value: 'staging' })).run(projectDir);

        expect(await builtSource(join(projectDir, 'dist'))).toContain('fixture:mode staging');
    }, 120_000);

    it('ships import.meta.env.DEV as false by default', async () => {
        vi.stubEnv('NODE_ENV', undefined);
        onTestFinished(() => {
            vi.unstubAllEnvs();
        });
        const projectDir = await copyFixture(FLAT_BOT);
        await appendFile(join(projectDir, 'index.ts'), 'console.log(`fixture:dev ${import.meta.env.DEV}`);\n');

        await quickBuildRunner().run(projectDir);

        expect(await builtSource(join(projectDir, 'dist'))).toContain('fixture:dev false');
    }, 120_000);

    it('reads VITE_ values from the .env beside the config when root is a subfolder', async () => {
        const projectDir = await copyFixture(GATEWAY_BOT);
        await appendFile(
            join(projectDir, 'src/index.ts'),
            'console.log(`fixture:env ${import.meta.env.VITE_GREETING}`);\n'
        );
        await writeFile(join(projectDir, '.env'), 'VITE_GREETING=hi from the project\n');

        await quickBuildRunner().run(projectDir);

        expect(await builtSource(join(projectDir, 'dist'))).toContain('fixture:env hi from the project');
    }, 120_000);
});
