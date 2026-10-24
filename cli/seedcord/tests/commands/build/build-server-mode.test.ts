import { appendFile, cp, mkdir, mkdtempDisposable, readFile, rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { ShellMode } from '#src/core/ShellMode';
import { linkPackages } from '#tests/edgeFolder';

import { builtSource, copyFixture, FLAT_BOT, GATEWAY_BOT, HTTP_BOT } from './fixtureCopy';
import { quickBuildRunner } from './quickBuildRunner';
import { smoke } from './smoke';

describe('seedcord build mode on a node bot', () => {
    it.each([
        ['gateway', GATEWAY_BOT],
        ['http', HTTP_BOT]
    ] as const)(
        'keeps Vite values fixed and runtime values deployable on %s',
        async (kind, fixture) => {
            await using temporary = await mkdtempDisposable(join(tmpdir(), 'seedcord-env-build-'));
            const projectDir = join(temporary.path, 'project');
            await cp(fixture, projectDir, { recursive: true, filter: (source) => !source.endsWith('dist') });
            await mkdir(join(projectDir, 'node_modules/@seedcord'), { recursive: true });
            await linkPackages(projectDir, ['envapt', '@seedcord/tsconfig', `@seedcord/${kind}`]);
            const configSource = await readFile(join(projectDir, 'seedcord.config.ts'), 'utf8');
            await writeFile(
                join(projectDir, 'seedcord.config.ts'),
                configSource.replace(
                    'export default {',
                    `export default {
    vitePlugins: () => [{ name: 'env-prefix', config: () => ({ envPrefix: ['VITE_', 'APP_'] }) }],`
                )
            );
            const bot = join(projectDir, 'src/bot.ts');
            await writeFile(bot, `import './env-probe';\n${await readFile(bot, 'utf8')}`);
            await writeFile(
                join(projectDir, 'src/env-probe.ts'),
                `import { Envapter, PortableSource, merge } from 'envapt';
Envapter.useSource(merge(Envapter.source, new PortableSource({ CUSTOM: 'composed' })));
if (Envapter.get('VITE_GREETING') !== import.meta.env.VITE_GREETING) throw new Error('Vite sources disagree');
if (Envapter.get('APP_GREETING') !== import.meta.env.APP_GREETING) throw new Error('Custom prefix sources disagree');
console.log('fixture:vite', Envapter.get('VITE_GREETING'));
console.log('fixture:app', Envapter.get('APP_GREETING'));
console.log('fixture:runtime', Envapter.get('RUNTIME_GREETING'));
console.log('fixture:custom', Envapter.get('CUSTOM'));
Envapter.envFileOptions = { override: true };
console.log('fixture:override', Envapter.get('VITE_GREETING'));
Envapter.envFileOptions = {};
Envapter.useSource(new PortableSource(Envapter.source.readVars()));
`
            );
            await writeFile(
                join(projectDir, '.env'),
                'VITE_GREETING=built\nAPP_GREETING=built-app\nRUNTIME_GREETING=before\n'
            );
            const previousCwd = process.cwd();
            try {
                process.chdir(projectDir);
                await quickBuildRunner().run(projectDir);
            } finally {
                process.chdir(previousCwd);
            }
            await writeFile(
                join(projectDir, '.env'),
                'VITE_GREETING=changed\nAPP_GREETING=changed-app\nRUNTIME_GREETING=deployed\n'
            );
            const deployedDir = join(temporary.path, 'deployed');
            await rename(projectDir, deployedDir);
            const output = await smoke(kind, process.execPath, [join(deployedDir, 'dist/index.mjs')]);

            expect(output).toContain('fixture:vite built');
            expect(output).toContain('fixture:app built-app');
            expect(output).toContain('fixture:runtime deployed');
            expect(output).toContain('fixture:custom composed');
            expect(output).toContain('fixture:override changed');
        },
        120_000
    );

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
