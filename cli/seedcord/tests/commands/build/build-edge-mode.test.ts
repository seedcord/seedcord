import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { isPlainObject } from '@seedcord/utils/internal';
import { describe, expect, it } from 'vitest';

import { withEnv } from '#tests/envapt';

import { copyEdgeBotForTest, edgeBuildRunner } from './edgeBot';

// the plugin calls a config that exports a function with vite's mode
const MODE_NAMED_CONFIG = `export default ({ mode }) => ({
    worker: {
        name: \`edge-bot-\${mode}\`,
        compatibilityDate: '2026-08-04',
        env: { DISCORD_BOT_TOKEN: { type: 'secret' }, DISCORD_PUBLIC_KEY: { type: 'secret' } }
    }
});
`;

async function builtWorkerName(): Promise<unknown> {
    const projectDir = await copyEdgeBotForTest();
    await writeFile(join(projectDir, 'cloudflare.config.ts'), MODE_NAMED_CONFIG);
    const { bundle } = await edgeBuildRunner().run(projectDir);
    // cloudflare's build output spec puts worker.config.json beside the bundle folder
    const workerConfig = join(dirname(dirname(bundle.entry)), 'worker.config.json');
    const config: unknown = JSON.parse(await readFile(workerConfig, 'utf8'));
    return isPlainObject(config) ? config.name : undefined;
}

describe('seedcord build mode on an edge bot', () => {
    it('builds in production when ENVIRONMENT, ENV and NODE_ENV are unset', async () => {
        withEnv({});

        await expect(builtWorkerName()).resolves.toBe('edge-bot-production');
    }, 120_000);

    it('builds in the mode ENVIRONMENT sets', async () => {
        withEnv({ ENVIRONMENT: 'staging' });

        await expect(builtWorkerName()).resolves.toBe('edge-bot-staging');
    }, 120_000);
});
