import path from 'node:path';

import { HostPlugins } from '@seedcord/types/internal';
import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vite-plus/test';

import { CommandRegistry } from '#src/commands/CommandRegistry';
import { GLOBAL_ID } from '#src/commands/scopes';
import { Bus } from '#subscribers/Bus';

import type { CoreBase } from '#interfaces/CoreBase';

const FIXTURE = path.join(import.meta.dirname, 'fixtures', 'profiles');

function registryWith(): CommandRegistry {
    // justified: refresh reads only these members off core
    const core = {
        config: { bot: { commands: { path: FIXTURE } } },
        rest: { put: vi.fn().mockResolvedValue([]), on: vi.fn(), off: vi.fn() },
        applicationId: 'app-1',
        [HostPlugins]: { prepareCommands: () => undefined }
    } as unknown as { bus: Bus };
    core.bus = new Bus(core as unknown as CoreBase);
    return new CommandRegistry(core as unknown as CoreBase);
}

function profileTypes(registry: CommandRegistry): (ApplicationCommandType | undefined)[] {
    return (registry.scopedCommands.get(GLOBAL_ID) ?? [])
        .filter((command) => command.name === 'profile')
        .map((command) => command.toJSON().type);
}

describe('CommandRegistry.refresh', () => {
    it('unregisters only the class that the deleted file exported', async () => {
        const registry = registryWith();
        await registry.init();

        // both menus are named profile, and the two types may share a name in discord
        await registry.onHmr({ file: path.join(FIXTURE, 'UserProfile.ts'), type: 'delete' });
        await registry.refresh();

        expect(profileTypes(registry)).toEqual([ApplicationCommandType.Message]);
    });
});
