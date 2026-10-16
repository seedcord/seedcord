import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { readBuildOutput } from '@cloudflare/build-output-utils';
import { describe, expect, it } from 'vitest';

import { withShellEnv } from '#tests/envapt';

import { copyEdgeBotForTest, edgeBuildRunner } from './edgeBot';

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

async function builtWorkerName(): Promise<string> {
    const projectDir = await copyEdgeBotForTest();
    await writeFile(join(projectDir, 'cloudflare.config.ts'), MODE_NAMED_CONFIG);
    await edgeBuildRunner().run(projectDir);
    const { workers } = await readBuildOutput(projectDir);
    return workers.default.config.name;
}

describe('seedcord build mode on an edge bot', () => {
    it('builds in production when ENVIRONMENT, ENV and NODE_ENV are unset', async () => {
        withShellEnv({});

        await expect(builtWorkerName()).resolves.toBe('edge-bot-production');
    }, 120_000);

    it('builds in the mode ENVIRONMENT sets', async () => {
        withShellEnv({ ENVIRONMENT: 'staging' });

        await expect(builtWorkerName()).resolves.toBe('edge-bot-staging');
    }, 120_000);
});
