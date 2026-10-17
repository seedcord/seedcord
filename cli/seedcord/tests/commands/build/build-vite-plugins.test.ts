import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { configWithGreetingPlugin, GREETING, GREETING_PROBE } from '#tests/greetingPlugin';

import { copyEdgeBotForTest, edgeBuildRunner } from './edgeBot';
import { builtSource, copyFixture, GATEWAY_BOT } from './fixtureCopy';
import { quickBuildRunner } from './quickBuildRunner';

describe('seedcord build with vitePlugins', () => {
    it("runs them on a server bot's code", async () => {
        const projectDir = await copyFixture(GATEWAY_BOT);
        await writeFile(
            join(projectDir, 'seedcord.config.ts'),
            configWithGreetingPlugin("root: './src', instance: './bot.ts', entry: './index.ts'")
        );
        await writeFile(join(projectDir, 'src/probe.ts'), GREETING_PROBE);

        await quickBuildRunner().run(projectDir);

        expect(await builtSource(join(projectDir, 'dist'))).toContain(GREETING);
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
