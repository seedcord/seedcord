import { SlashCommandBuilder } from '@discordjs/builders';
import { Collection } from 'discord.js';
import { describe, it, expect, vi } from 'vitest';

import { CommandRegistry } from '@bControllers/CommandRegistry';

import type { Core } from '@interfaces/Core';
import type { ApplicationCommand } from 'discord.js';

function stubCore(set: ReturnType<typeof vi.fn>): Core {
    return {
        config: { bot: { commands: { path: 'commands' } } },
        bot: { client: { application: { commands: { set } }, guilds: { cache: new Collection() } } }
        // fixture: setCommands only reads the deploy path, the command managers, and the guild cache
    } as unknown as Core;
}

describe('CommandRegistry.setCommands', () => {
    it('returns the global collection captured from application.commands.set', async () => {
        const deployed = new Collection<string, ApplicationCommand>();
        // fixture: only the id (key) and name flow downstream into mentions
        deployed.set('123', { id: '123', name: 'ping' } as unknown as ApplicationCommand);
        const set = vi.fn().mockResolvedValue(deployed);

        const registry = new CommandRegistry(stubCore(set));
        registry.globalCommands.push(new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'));

        const result = await registry.setCommands();

        expect(set).toHaveBeenCalledOnce();
        expect(result.global.get('123')?.name).toBe('ping');
    });

    it('fires the onDeployed callback with the deploy result', async () => {
        const deployed = new Collection<string, ApplicationCommand>();
        // fixture: only the id (key) and name flow downstream into mentions
        deployed.set('123', { id: '123', name: 'ping' } as unknown as ApplicationCommand);
        const set = vi.fn().mockResolvedValue(deployed);
        const onDeployed = vi.fn();

        const registry = new CommandRegistry(stubCore(set), onDeployed);
        registry.globalCommands.push(new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'));

        const result = await registry.setCommands();

        expect(onDeployed).toHaveBeenCalledWith(result);
    });
});
