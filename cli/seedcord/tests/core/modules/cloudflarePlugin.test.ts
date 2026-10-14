import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, onTestFinished } from 'vitest';

import { importWrangler, readDevPort } from '#core/modules/cloudflarePlugin';

async function wranglerConfig(text: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'seedcord-wrangler-'));
    onTestFinished(() => rm(dir, { recursive: true, force: true }));
    const config = join(dir, 'wrangler.jsonc');
    await writeFile(config, text);
    return config;
}

describe('readDevPort', () => {
    it('throws CliEdgeWranglerMissing when the project lacks wrangler', async () => {
        const config = await wranglerConfig('{ "name": "bot" }');
        const missing = Object.assign(
            new Error("Cannot find package 'wrangler' imported from /bot/node_modules/seedcord/dist/cli.mjs"),
            { code: 'ERR_MODULE_NOT_FOUND' }
        );

        await expect(readDevPort(config, () => Promise.reject(missing))).rejects.toHaveProperty(
            'code',
            SeedcordErrorCode.CliEdgeWranglerMissing
        );
    });

    it('throws CliWranglerConfigUnreadable when wrangler cannot parse the config', async () => {
        const config = await wranglerConfig('{ "name": ');

        await expect(readDevPort(config, importWrangler)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliWranglerConfigUnreadable,
            message: expect.stringContaining('wrangler.jsonc') as string
        });
    });
});
