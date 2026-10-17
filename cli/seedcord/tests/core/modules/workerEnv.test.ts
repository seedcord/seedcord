import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { assert, describe, expect, it, onTestFinished, vi } from 'vitest';

import { WorkerEnv } from '#core/modules/workerEnv';
import { cloudflareConfigSource, edgeFolder } from '#tests/edgeFolder';

const SECRET_AND_TEXT = cloudflareConfigSource('DISCORD_BOT_TOKEN: bindings.secret(), ENV: bindings.text(mode)');

describe('WorkerEnv', () => {
    it('gives the node copy only the bindings cloudflare.config.ts declares', async () => {
        const { dir, cloudflareConfig } = await edgeFolder(SECRET_AND_TEXT);
        await writeFile(join(dir, '.env'), 'DISCORD_BOT_TOKEN=from-env\nUNDECLARED=leaks\n');

        const workerEnv = await WorkerEnv.load(cloudflareConfig, 'staging');

        expect(workerEnv.values()).toEqual({ DISCORD_BOT_TOKEN: 'from-env', ENV: 'staging' });
    });

    it('gives the node copy the value of a json binding', async () => {
        const { cloudflareConfig } = await edgeFolder(cloudflareConfigSource('LIMITS: bindings.json({ max: 3 })'));

        const workerEnv = await WorkerEnv.load(cloudflareConfig, 'development');

        expect(workerEnv.values()).toEqual({ LIMITS: { max: 3 } });
    });

    it('throws CliEdgeNoWorker for a cloudflare.config.ts that sets no worker', async () => {
        const { cloudflareConfig } = await edgeFolder('export default {};\n');

        await expect(WorkerEnv.load(cloudflareConfig, 'development')).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeNoWorker
        });
    });

    it.each([
        ['throws', "throw new Error('boom in config');\n"],
        ['does not parse', "export default { worker: { name: 'x',\n"]
    ])('throws CliConfigFileUnreadable with the file for a cloudflare.config.ts that %s', async (_case, source) => {
        const { cloudflareConfig } = await edgeFolder(source);

        await expect(WorkerEnv.load(cloudflareConfig, 'development')).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigFileUnreadable,
            message: expect.stringContaining('cloudflare.config.ts') as string
        });
    });

    it('throws CliDependencyMissing when cloudflare.config.ts imports cf and the project lacks it', async () => {
        const { cloudflareConfig } = await edgeFolder(SECRET_AND_TEXT, []);

        const caught: unknown = await WorkerEnv.load(cloudflareConfig, 'development').catch((error: unknown) => error);

        assert(isSeedcordError(caught));
        expect(caught.code).toBe(SeedcordErrorCode.CliDependencyMissing);
        expect(stripVTControlCharacters(caught.message)).toContain('Add cf to');
    });

    it('throws CliEdgeOnBun on bun', async () => {
        vi.stubGlobal('Bun', {});
        onTestFinished(() => {
            vi.unstubAllGlobals();
        });
        const { cloudflareConfig } = await edgeFolder(SECRET_AND_TEXT);

        await expect(WorkerEnv.load(cloudflareConfig, 'development')).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeOnBun
        });
    });

    it('throws CliConfigFieldUnused when cloudflare.config.ts sets entrypoint', async () => {
        const { cloudflareConfig } = await edgeFolder(
            SECRET_AND_TEXT.replace("name: 'edge-bot',", "name: 'edge-bot', entrypoint: './src/bot.ts',")
        );

        await expect(WorkerEnv.load(cloudflareConfig, 'development')).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigFieldUnused
        });
    });

    it('throws CliConfigFileUnreadable with the problem for a config Cloudflare rejects', async () => {
        const { cloudflareConfig } = await edgeFolder(SECRET_AND_TEXT.replace(" compatibilityDate: '2026-08-04',", ''));

        await expect(WorkerEnv.load(cloudflareConfig, 'development')).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigFileUnreadable,
            message: expect.stringContaining('compatibilityDate') as string
        });
    });
});
