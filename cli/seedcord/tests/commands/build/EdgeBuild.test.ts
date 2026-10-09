import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { assert, describe, expect, it } from 'vitest';

import { EdgeBuild } from '#commands/build/builder/EdgeBuild';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { openModuleLoader } from '#core/modules/openModuleLoader';

const EDGE_BOT = join(import.meta.dirname, '../../fixtures/edge-bot');

describe('EdgeBuild', () => {
    it('throws CliEdgeVitePluginMissing when the project lacks @cloudflare/vite-plugin', async () => {
        await using project = await new ProjectLoader(openModuleLoader).open(EDGE_BOT);
        const { target } = project.config;
        assert(target.kind === 'edge');
        const notFound = Object.assign(new Error("Cannot find package '@cloudflare/vite-plugin'"), {
            code: 'ERR_MODULE_NOT_FOUND'
        });

        const build = new EdgeBuild(project, target, () => Promise.reject(notFound));

        await expect(build.bundle()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeVitePluginMissing,
            message: expect.stringContaining('edge-bot') as string
        });
    });
});
