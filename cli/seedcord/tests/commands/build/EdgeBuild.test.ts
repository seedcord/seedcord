import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { Envapter, PortableSource } from 'envapt';
import { assert, describe, expect, it } from 'vitest';

import { EdgeBuild } from '#commands/build/builder/EdgeBuild';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { importInstance } from '#core/modules/importInstance';
import { openModuleLoader } from '#core/modules/openModuleLoader';

import type * as CloudflareVitePlugin from '@cloudflare/vite-plugin';
import type { BakedIds } from '@seedcord/core/internal';
import type { Plugin } from 'vite';

const EDGE_BOT = join(import.meta.dirname, '../../fixtures/edge-bot');

const NO_IDS: BakedIds = {
    publicKey: 'ab'.repeat(32),
    emojis: {},
    commands: {},
    contextMenus: { user: {}, message: {} }
};

// node's wording, with the importing file at the end
function notFound(name: string, importer: string): Error {
    return Object.assign(new Error(`Cannot find package '${name}' imported from ${importer}`), {
        code: 'ERR_MODULE_NOT_FOUND'
    });
}

describe('EdgeBuild', () => {
    it('throws CliDependencyMissing when the project lacks @cloudflare/vite-plugin', async () => {
        await using project = await new ProjectLoader(openModuleLoader).open(EDGE_BOT);
        const { target } = project.config;
        assert(target.kind === 'edge');

        const missing = notFound('@cloudflare/vite-plugin', '/bot/node_modules/seedcord/dist/cli.mjs');
        const build = new EdgeBuild(project, target, { importCloudflare: () => Promise.reject(missing) });

        await expect(build.bundle(NO_IDS)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliDependencyMissing,
            message: expect.stringContaining('edge-bot') as string
        });
    });

    it('throws CoreImportFailed when the plugin loads but one of its own imports is missing', async () => {
        await using project = await new ProjectLoader(openModuleLoader).open(EDGE_BOT);
        const { target } = project.config;
        assert(target.kind === 'edge');

        const missing = notFound('miniflare', '/bot/node_modules/@cloudflare/vite-plugin/dist/index.mjs');
        const build = new EdgeBuild(project, target, { importCloudflare: () => Promise.reject(missing) });

        await expect(build.bundle(NO_IDS)).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreImportFailed,
            message: expect.stringContaining('miniflare') as string
        });
    });

    it('throws CliDependencyMissing when cloudflare.config.ts imports cf and the project lacks it', async () => {
        await using project = await new ProjectLoader(openModuleLoader).open(EDGE_BOT);
        const { target } = project.config;
        assert(target.kind === 'edge');

        // the plugin loads cloudflare.config.ts in its config hook
        const missing = notFound('cf', target.cloudflareConfig);
        const plugin: Plugin = {
            name: 'loads-cloudflare-config',
            config: () => {
                throw missing;
            }
        };
        // justified: EdgeBuild calls only cloudflare() on the module
        const cloudflarePlugin = { cloudflare: () => [plugin] } as unknown as typeof CloudflareVitePlugin;
        const build = new EdgeBuild(project, target, { importCloudflare: () => Promise.resolve(cloudflarePlugin) });

        await expect(build.bundle(NO_IDS)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliDependencyMissing,
            message: expect.stringContaining('edge-bot') as string
        });
    });

    it('throws ConfigMissingEnv when DISCORD_BOT_TOKEN is unset', async () => {
        await using project = await new ProjectLoader(openModuleLoader).open(EDGE_BOT);
        const { target } = project.config;
        assert(target.kind === 'edge');
        const { config } = await importInstance(project.modules, project.config.instance);
        // opening the project binds process.env
        Envapter.useSource(new PortableSource({}));

        await expect(new EdgeBuild(project, target).readDiscord(config.bot)).rejects.toMatchObject({
            code: SeedcordErrorCode.ConfigMissingEnv
        });
    });

    it('scans a relative commands path from root', async () => {
        await using project = await new ProjectLoader(openModuleLoader).open(EDGE_BOT);
        const { target, root } = project.config;
        assert(target.kind === 'edge');
        const { config } = await importInstance(project.modules, project.config.instance);
        const build = new EdgeBuild(project, target, { openDiscord: () => ({ get: () => Promise.resolve([]) }) });

        await expect(build.readDiscord({ ...config.bot, commands: { path: './no-commands' } })).rejects.toMatchObject({
            code: SeedcordErrorCode.CorePathUnreadable,
            message: expect.stringContaining(join(root, 'no-commands')) as string
        });
    });
});
