import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { readBuildOutput } from '@cloudflare/build-output-utils';
import { describe, expect, it } from 'vitest';

import { ShellMode } from '#core/viteMode';

import { copyEdgeBotForTest, edgeBuildRunner, fakeDiscord } from './edgeBot';

// the plugin calls a config that exports a function with vite's mode
const MODE_NAMED_CONFIG = `import { bindings, defineConfig } from 'cf/config';

export default defineConfig(({ mode }) => ({
    worker: {
        name: \`edge-bot-\${mode}\`,
        compatibilityDate: '2026-08-04',
        env: { DISCORD_BOT_TOKEN: bindings.secret(), DISCORD_PUBLIC_KEY: bindings.secret() }
    }
}));
`;

async function builtWorkerName(shell: ShellMode): Promise<string> {
    const projectDir = await copyEdgeBotForTest();
    await writeFile(join(projectDir, 'cloudflare.config.ts'), MODE_NAMED_CONFIG);
    await edgeBuildRunner(fakeDiscord(), shell).run(projectDir);
    const { workers } = await readBuildOutput(projectDir);
    return workers.default.config.name;
}

describe('seedcord build mode on an edge bot', () => {
    it('builds in production when the shell sets no mode', async () => {
        await expect(builtWorkerName(new ShellMode())).resolves.toBe('edge-bot-production');
    }, 120_000);

    it('builds in the mode the shell sets', async () => {
        const shell = new ShellMode({ key: 'ENVIRONMENT', value: 'staging' });

        await expect(builtWorkerName(shell)).resolves.toBe('edge-bot-staging');
    }, 120_000);
});
