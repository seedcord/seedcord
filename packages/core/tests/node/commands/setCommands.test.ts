import { ContextMenuCommandBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { ApplicationCommandType, Routes } from 'discord-api-types/v10';
import { describe, it, expect, vi } from 'vitest';

import { CommandRegistry } from '#node/commands/CommandRegistry';
import { Commands } from '#src/commands/CommandInjector';
import { Bus } from '#subscribers/Bus';

import type { CoreBase } from '#interfaces/CoreBase';
import type { CommandInfo } from '#src/commands/CommandInjector';
import type { APIApplicationCommand } from 'discord-api-types/v10';

const APP = 'app-1';

// justified: SlashRegistry is empty in tests
const mentions = Commands as Record<string, CommandInfo>;

function deployedAs(id: string, name: string): APIApplicationCommand[] {
    // justified: mentions read only these three fields
    return [{ id, name, type: ApplicationCommandType.ChatInput } as APIApplicationCommand];
}

function coreWith(put: ReturnType<typeof vi.fn>): CoreBase {
    // justified: the registry reads only these four members off core
    const core = {
        config: { bot: { commands: { path: 'commands' } } },
        rest: { put },
        applicationId: APP
    } as unknown as { bus: Bus };
    core.bus = new Bus(core as unknown as CoreBase);
    return core as unknown as CoreBase;
}

function registryWith(put: ReturnType<typeof vi.fn>): CommandRegistry {
    return new CommandRegistry(coreWith(put));
}

describe('CommandRegistry.setCommands', () => {
    it('publishes commandsDeployed with what discord returned', async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('123', 'ping'));
        const core = coreWith(put);
        const registry = new CommandRegistry(core);
        registry.globalCommands.push(new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'));
        const heard = vi.fn();
        core.bus.on('commandsDeployed', heard);

        await registry.setCommands();

        expect(heard).toHaveBeenCalledWith({ global: [expect.objectContaining({ id: '123' })], guilds: {} });
    });

    it('keys the published guild arm by guild id', async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('g-1', 'config'));
        const core = coreWith(put);
        const registry = new CommandRegistry(core);
        registry.guildCommands.set('111', [new SlashCommandBuilder().setName('config').setDescription('Config')]);
        const heard = vi.fn();
        core.bus.on('commandsDeployed', heard);

        await registry.setCommands();

        expect(heard).toHaveBeenCalledWith({
            global: [],
            guilds: { '111': [expect.objectContaining({ id: 'g-1' })] }
        });
    });

    it('fills the command mention accessor from the deploy', async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('123', 'ping'));
        const registry = registryWith(put);
        registry.globalCommands.push(new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'));

        await registry.setCommands();

        expect(mentions.ping?.mention).toBe('</ping:123>');
    });

    it('puts the global bucket to the application commands route and indexes the result by id', async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('123', 'ping'));
        const registry = registryWith(put);
        registry.globalCommands.push(new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'));

        const result = await registry.setCommands();

        expect(put).toHaveBeenCalledOnce();
        expect(put.mock.calls[0]?.[0]).toBe(Routes.applicationCommands(APP));
        expect(result.global.get('123')?.name).toBe('ping');
    });

    it('puts each guild bucket to that guild commands route', async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('g-1', 'config'));
        const registry = registryWith(put);
        registry.guildCommands.set('111', [new SlashCommandBuilder().setName('config').setDescription('Config')]);

        const result = await registry.setCommands();

        expect(put.mock.calls[0]?.[0]).toBe(Routes.applicationGuildCommands(APP, '111'));
        expect(result.guilds.get('111')?.get('g-1')?.name).toBe('config');
    });

    it('sends the built command json as the put body', async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('123', 'ping'));
        const registry = registryWith(put);
        registry.globalCommands.push(new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'));

        await registry.setCommands();

        const { body } = put.mock.calls[0]?.[1] as { body: { name: string }[] };
        expect(body).toHaveLength(1);
        expect(body[0]?.name).toBe('ping');
    });

    it('rejects when a guild deploy fails', async () => {
        const put = vi.fn().mockRejectedValue(new Error('Missing Access'));
        const registry = registryWith(put);
        registry.guildCommands.set('999', [new SlashCommandBuilder().setName('config').setDescription('Config')]);

        await expect(registry.setCommands()).rejects.toThrow('Missing Access');
    });

    it('puts nothing when no commands are registered', async () => {
        const put = vi.fn();

        const result = await registryWith(put).setCommands();

        expect(put).not.toHaveBeenCalled();
        expect(result.global.size).toBe(0);
        expect(result.guilds.size).toBe(0);
    });
});

describe('CommandRegistry.contextMenuLeaves', () => {
    it('splits the registered context-menu names by kind and drops the slash commands', () => {
        const registry = registryWith(vi.fn());
        registry.globalCommands.push(
            new ContextMenuCommandBuilder().setName('Report').setType(ApplicationCommandType.Message),
            new ContextMenuCommandBuilder().setName('Profile').setType(ApplicationCommandType.User),
            new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!')
        );

        const leaves = registry.contextMenuLeaves();

        expect([...leaves.message]).toEqual(['Report']);
        expect([...leaves.user]).toEqual(['Profile']);
    });
});
