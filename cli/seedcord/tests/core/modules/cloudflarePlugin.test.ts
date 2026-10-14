import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, onTestFinished } from 'vitest';

import { importWrangler, readWranglerDev } from '#core/modules/cloudflarePlugin';

async function wranglerConfig(text: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'seedcord-wrangler-'));
    onTestFinished(() => rm(dir, { recursive: true, force: true }));
    const config = join(dir, 'wrangler.jsonc');
    await writeFile(config, text);
    return config;
}

describe('readWranglerDev', () => {
    it('throws CliEdgeWranglerMissing when the project lacks wrangler', async () => {
        const config = await wranglerConfig('{ "name": "bot" }');
        const missing = Object.assign(
            new Error("Cannot find package 'wrangler' imported from /bot/node_modules/seedcord/dist/cli.mjs"),
            { code: 'ERR_MODULE_NOT_FOUND' }
        );

        await expect(readWranglerDev(config, undefined, () => Promise.reject(missing))).rejects.toHaveProperty(
            'code',
            SeedcordErrorCode.CliEdgeWranglerMissing
        );
    });

    it('throws CliImportFailed when wrangler fails to load for another reason', async () => {
        const config = await wranglerConfig('{ "name": "bot" }');

        await expect(
            readWranglerDev(config, undefined, () =>
                Promise.reject(new SyntaxError('Unexpected token in wrangler.mjs'))
            )
        ).rejects.toMatchObject({
            code: SeedcordErrorCode.CliImportFailed,
            message: expect.stringContaining('Unexpected token in wrangler.mjs') as string
        });
    });

    it('throws CliEdgeWranglerConfigUnreadable with the position wrangler reports', async () => {
        const config = await wranglerConfig('{ "name": ');

        await expect(readWranglerDev(config, undefined, importWrangler)).rejects.toMatchObject({
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
        await expect(readWranglerDev(await wranglerConfig(text), undefined, importWrangler)).resolves.toHaveProperty(
            'port',
            port
        );
    });

    it("reads the worker's vars from the config and .dev.vars", async () => {
        const config = await wranglerConfig('{ "name": "bot", "vars": { "REGION": "eu", "LIMITS": { "max": 3 } } }');
        await writeFile(join(dirname(config), '.dev.vars'), 'API_TOKEN=secret\n');

        const { vars } = await readWranglerDev(config, undefined, importWrangler);

        expect(vars).toEqual({ REGION: 'eu', LIMITS: { max: 3 }, API_TOKEN: 'secret' });
    });

    it('reads the .dev.vars file for the CLOUDFLARE_ENV environment', async () => {
        const config = await wranglerConfig('{ "name": "bot", "env": { "staging": {} } }');
        await writeFile(join(dirname(config), '.dev.vars'), 'API_TOKEN=local\n');
        await writeFile(join(dirname(config), '.dev.vars.staging'), 'API_TOKEN=staging\n');

        const { vars } = await readWranglerDev(config, 'staging', importWrangler);

        expect(vars).toEqual({ API_TOKEN: 'staging' });
    });
});
