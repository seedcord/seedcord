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

    it('throws CliImportFailed when wrangler fails to load for another reason', async () => {
        const config = await wranglerConfig('{ "name": "bot" }');

        await expect(
            readDevPort(config, () => Promise.reject(new SyntaxError('Unexpected token in wrangler.mjs')))
        ).rejects.toMatchObject({
            code: SeedcordErrorCode.CliImportFailed,
            message: expect.stringContaining('Unexpected token in wrangler.mjs') as string
        });
    });

    it('throws CliEdgeWranglerConfigUnreadable with the position wrangler reports', async () => {
        const config = await wranglerConfig('{ "name": ');

        await expect(readDevPort(config, importWrangler)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeWranglerConfigUnreadable,
            message: expect.stringMatching(/wrangler\.jsonc.*at line 1, column \d+/) as string
        });
    });

    it.each([
        ['{ "name": "bot" }', 8787],
        ['{ "name": "bot", "dev": {} }', 8787],
        ['{ "name": "bot", "dev": { "port": 9000 } }', 9000],
        ['{ "name": "bot", "dev": { "port": 0 } }', 0]
    ])('reads the port from %s as %i', async (text, port) => {
        await expect(readDevPort(await wranglerConfig(text), importWrangler)).resolves.toBe(port);
    });
});
