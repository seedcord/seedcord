import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { assert, describe, expect, it } from 'vitest';

import { configWithGreetingPlugin, GREETING, GREETING_PROBE } from '#tests/greetingPlugin';

import { copyEdgeBotForTest, edgeBuildRunner } from './edgeBot';
import { builtSource, copyFixture, GATEWAY_BOT } from './fixtureCopy';
import { quickBuildRunner } from './quickBuildRunner';

describe('seedcord build with vitePlugins', () => {
    it("runs them on a server bot's code", async () => {
        const projectDir = await copyFixture(GATEWAY_BOT);
        await writeFile(
            join(projectDir, 'seedcord.config.ts'),
            configWithGreetingPlugin("root: './src', instance: './bot.ts', build: { start: './index.ts' }")
        );
        await writeFile(join(projectDir, 'src/probe.ts'), GREETING_PROBE);

        await quickBuildRunner().run(projectDir);

        expect(await builtSource(join(projectDir, 'dist'))).toContain(GREETING);
    }, 120_000);

    // the load bot step runs vite as serve
    it.each([
        ['config', "config: (_config, env) => { if (env.command === 'build') throw new Error('bad build option'); }"],
        [
            'buildStart',
            "configResolved: (config) => { command = config.command; }, buildStart: () => { if (command === 'build') throw new Error('bad build option'); }"
        ]
    ])(
        'throws CoreVitePluginThrew for a plugin that throws in %s while bundling',
        async (hook, hooks) => {
            const projectDir = await copyFixture(GATEWAY_BOT);
            await writeFile(
                join(projectDir, 'seedcord.config.ts'),
                `let command;

export default {
    root: './src',
    instance: './bot.ts',
    build: { start: './index.ts' },
    vitePlugins: () => [{ name: 'breaks-the-build', ${hooks} }]
};
`
            );

            const caught: unknown = await quickBuildRunner()
                .run(projectDir)
                .catch((error: unknown) => error);

            assert(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CoreVitePluginThrew));
            expect(caught.message).toContain('breaks-the-build');
            expect(caught.message).toContain(hook);
        },
        120_000
    );

    it('throws CoreVitePluginThrew for a plugin that throws while an edge bot bundles', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeFile(
            join(projectDir, 'seedcord.config.ts'),
            `let command;

export default {
    root: './src',
    instance: './bot.ts',
    vitePlugins: () => [
        {
            name: 'breaks-the-worker',
            configResolved: (config) => { command = config.command; },
            buildStart: () => { if (command === 'build') throw new Error('bad worker option'); }
        }
    ]
};
`
        );

        const caught: unknown = await edgeBuildRunner()
            .run(projectDir)
            .catch((error: unknown) => error);

        assert(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CoreVitePluginThrew));
        expect(caught.message).toContain('breaks-the-worker');
    }, 120_000);

    it("runs them on an edge bot's code", async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeFile(
            join(projectDir, 'seedcord.config.ts'),
            configWithGreetingPlugin("root: './src', instance: './bot.ts'")
        );
        await writeFile(join(projectDir, 'src/probe.ts'), GREETING_PROBE);

        const { bundle } = await edgeBuildRunner().run(projectDir);

        expect(await builtSource(dirname(bundle.entry))).toContain(GREETING);
    }, 120_000);
});
