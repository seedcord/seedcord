import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { CommandRegistry } from '#src/commands/CommandRegistry';
import { GLOBAL_ID } from '#src/commands/scopes';

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

        expect(registry.scopedCommands.get('111')?.map((command) => command.name)).toEqual(['bare']);
        expect(registry.scopedCommands.get('222')?.map((command) => command.name)).toEqual(['bare']);
        expect(registry.scopedCommands.has(GLOBAL_ID)).toBe(false);
    });

    it('loads a command with no scope globally when the config names no guilds', async () => {
        const registry = registryWith();

        await registry.init();

        expect([...registry.scopedCommands.keys()]).toEqual([GLOBAL_ID]);
        expect(registry.scopedCommands.get(GLOBAL_ID)?.map((command) => command.name)).toEqual(['bare']);
    });
});
