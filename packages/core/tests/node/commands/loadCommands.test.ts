import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { CommandRegistry } from '#node/commands/CommandRegistry';

import type { CoreBase } from '#interfaces/CoreBase';

const FIXTURE = path.join(import.meta.dirname, 'fixtures', 'commands');

function registryWith(guilds?: string[]): CommandRegistry {
    // justified: init reads only the commands config off core
    const core = { config: { bot: { commands: { path: FIXTURE, guilds } } } } as unknown as CoreBase;

    return new CommandRegistry(core);
}

describe('CommandRegistry.init', () => {
    it('loads a command with no scope into every configured guild', async () => {
        const registry = registryWith(['111', '222']);

        await registry.init();

        expect(registry.guildCommands.get('111')?.map((command) => command.name)).toEqual(['bare']);
        expect(registry.guildCommands.get('222')?.map((command) => command.name)).toEqual(['bare']);
        expect(registry.globalCommands).toHaveLength(0);
    });

    it('loads a command with no scope globally when the config names no guilds', async () => {
        const registry = registryWith();

        await registry.init();

        expect(registry.globalCommands.map((command) => command.name)).toEqual(['bare']);
        expect(registry.guildCommands.size).toBe(0);
    });
});
