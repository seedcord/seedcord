import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { assert, describe, expect, it } from 'vitest';

import { EdgeBuild } from '#commands/build/builder/EdgeBuild';
import { openProjectWithSteps } from '#core/config/openProjectWithSteps';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { importInstance } from '#core/modules/importInstance';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { quietSteps } from '#core/output/quietSteps';
import { ShellMode } from '#core/viteMode';
import { bindEnv } from '#tests/bindEnv';

import type { Project } from '#core/project/Project';
import type { BakedIds } from '@seedcord/core/internal';

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

function openEdgeBot(): Promise<Project> {
    return openProjectWithSteps(quietSteps, new ProjectLoader(openModuleLoader, new ShellMode()), {
        projectDir: EDGE_BOT
    });
}

describe('EdgeBuild', () => {
    it('throws CliDependencyMissing when the project lacks @cloudflare/vite-plugin', async () => {
        await using project = await openEdgeBot();
        const { target } = project.config;
        assert(target.kind === 'edge');

        const missing = notFound('@cloudflare/vite-plugin', '/bot/node_modules/seedcord/dist/cli.mjs');
        const build = new EdgeBuild(project, target, { importCloudflare: () => Promise.reject(missing) });

        const caught: unknown = await build.bundle(NO_IDS).catch((error: unknown) => error);

        assert(isSeedcordError(caught));
        expect(caught.code).toBe(SeedcordErrorCode.CliDependencyMissing);
        expect(stripVTControlCharacters(caught.message)).toContain('Add @cloudflare/vite-plugin to');
        expect(caught.message).toContain('edge-bot');
    });

    it('throws CoreImportFailed when the plugin loads but one of its own imports is missing', async () => {
        await using project = await openEdgeBot();
        const { target } = project.config;
        assert(target.kind === 'edge');

        const missing = notFound('miniflare', '/bot/node_modules/@cloudflare/vite-plugin/dist/index.mjs');
        const build = new EdgeBuild(project, target, { importCloudflare: () => Promise.reject(missing) });

        await expect(build.bundle(NO_IDS)).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreImportFailed,
            message: expect.stringContaining('miniflare') as string
        });
    });

    it('throws ConfigMissingEnv when DISCORD_BOT_TOKEN is unset', async () => {
        await using project = await openEdgeBot();
        const { target } = project.config;
        assert(target.kind === 'edge');
        const { config } = await importInstance(project.modules, project.config.instance);
        // opening the project binds process.env
        using _env = bindEnv({});

        await expect(new EdgeBuild(project, target).readDiscord(config.bot)).rejects.toMatchObject({
            code: SeedcordErrorCode.ConfigMissingEnv
        });
    });

    it('scans a relative commands path from root', async () => {
        await using project = await openEdgeBot();
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
