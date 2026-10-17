import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { HostPluginKeys } from '@seedcord/types/internal';
import { bindings } from 'cf/config';
import { describe, expect, it } from 'vitest';

import { openProjectWithSteps } from '#core/config/openProjectWithSteps';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { importInstance } from '#core/modules/importInstance';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { quietSteps } from '#core/output/quietSteps';
import { ShellMode } from '#core/viteMode';
import { copyEdgeBotForTest, writeCloudflareConfig } from '#tests/commands/build/edgeBot';

const EDGE_BOT = join(import.meta.dirname, '../../fixtures/edge-bot');
const LOADER = new ProjectLoader(openModuleLoader, new ShellMode());

describe('loading an edge bot', () => {
    it('builds the edge Seedcord with its edge-only plugin attached', async () => {
        await using project = await openProjectWithSteps(quietSteps, LOADER, { projectDir: EDGE_BOT });
        const instance = await importInstance(project.modules, project.config.instance);

        expect('start' in instance).toBe(false);
        expect(instance[HostPluginKeys]).toEqual(['counter']);
    });

    it("reads the .env file for the loader's mode", async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeCloudflareConfig(projectDir, { env: { PROBE: bindings.secret() } });
        await writeFile(join(projectDir, '.env.development'), 'PROBE=from-development\n');
        await writeFile(join(projectDir, '.env.production'), 'PROBE=from-production\n');
        const probe = await writeProbe(projectDir);

        const production = new ProjectLoader(openModuleLoader, new ShellMode(), 'production');
        await using project = await openProjectWithSteps(quietSteps, production, { projectDir });

        await expect(project.modules.importModule(probe)).resolves.toMatchObject({ value: 'from-production' });
    });

    it('reads a text binding from cloudflare.config.ts', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeCloudflareConfig(projectDir, { env: { PROBE: bindings.text('from-config') } });
        await writeFile(join(projectDir, '.env.development'), 'PROBE=from-env\n');
        const probe = await writeProbe(projectDir);

        await using project = await openProjectWithSteps(quietSteps, LOADER, { projectDir });

        await expect(project.modules.importModule(probe)).resolves.toMatchObject({ value: 'from-config' });
    });

    it('reads .dev.vars in place of the .env files when it exists', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeCloudflareConfig(projectDir, { env: { PROBE: bindings.secret() } });
        await writeFile(join(projectDir, '.dev.vars'), 'PROBE=from-dev-vars\n');
        await writeFile(join(projectDir, '.env.development'), 'PROBE=from-env\n');
        const probe = await writeProbe(projectDir);

        await using project = await openProjectWithSteps(quietSteps, LOADER, { projectDir });

        await expect(project.modules.importModule(probe)).resolves.toMatchObject({ value: 'from-dev-vars' });
    });
});

async function writeProbe(projectDir: string): Promise<string> {
    const probe = join(projectDir, 'src/probe.ts');
    await writeFile(probe, "import { env } from 'cloudflare:workers';\nexport const value = env.PROBE;\n");
    return probe;
}
