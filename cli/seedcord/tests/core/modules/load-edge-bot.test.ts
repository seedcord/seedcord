import { join } from 'node:path';

import { HostPluginKeys } from '@seedcord/types/internal';
import { describe, expect, it } from 'vitest';

import { ProjectLoader } from '#core/config/ProjectLoader';
import { importInstance } from '#core/modules/importInstance';
import { openModuleLoader } from '#core/modules/openModuleLoader';

const EDGE_BOT = join(import.meta.dirname, '../../fixtures/edge-bot');

describe('loading an edge bot', () => {
    it('builds the edge Seedcord with its edge-only plugin attached', async () => {
        await using project = await new ProjectLoader(openModuleLoader).open(EDGE_BOT);
        const instance = await importInstance(project.modules, project.config.instance);

        expect('start' in instance).toBe(false);
        expect(instance[HostPluginKeys]).toEqual(['counter']);
    });
});
