import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { HostPluginKeys } from '@seedcord/types/internal';
import { describe, expect, it } from 'vitest';

import { ProjectLoader } from '#core/config/ProjectLoader';
import { importInstance } from '#core/modules/importInstance';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { copyEdgeBotForTest } from '#tests/commands/build/edgeBot';

const EDGE_BOT = join(import.meta.dirname, '../../fixtures/edge-bot');

describe('loading an edge bot', () => {
    it('builds the edge Seedcord with its edge-only plugin attached', async () => {
        await using project = await new ProjectLoader(openModuleLoader).open(EDGE_BOT);
        const instance = await importInstance(project.modules, project.config.instance);

        expect('start' in instance).toBe(false);
        expect(instance[HostPluginKeys]).toEqual(['counter']);
    });

    it("reads the .env file for the loader's mode", async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeFile(join(projectDir, '.env.development'), 'PROBE=from-development\n');
        await writeFile(join(projectDir, '.env.production'), 'PROBE=from-production\n');
        const probe = join(projectDir, 'src/probe.ts');
        await writeFile(probe, "import { env } from 'cloudflare:workers';\nexport const value = env.PROBE;\n");

        await using project = await new ProjectLoader(openModuleLoader, 'production').open(projectDir);

        await expect(project.modules.importModule(probe)).resolves.toMatchObject({ value: 'from-production' });
    });
});
