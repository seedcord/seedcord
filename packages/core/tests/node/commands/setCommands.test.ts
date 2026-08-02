import { ContextMenuCommandBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { ApplicationCommandType, Routes } from 'discord-api-types/v10';
import { describe, it, expect, vi } from 'vitest';

import { CommandRegistry } from '@node/commands/CommandRegistry';

import type { REST } from '@discordjs/rest';
import type { DeployResult } from '@src/commands/types';
import type { APIApplicationCommand } from 'discord-api-types/v10';

const APP = 'app-1';

function deployedAs(id: string, name: string): APIApplicationCommand[] {
    // fixture: only the id and name flow downstream into mentions
    return [{ id, name } as APIApplicationCommand];
}

function registryWith(put: ReturnType<typeof vi.fn>, onDeployed?: (result: DeployResult) => void): CommandRegistry {
    return new CommandRegistry({
        dir: 'commands',
        // fixture: setCommands only calls put
        rest: { put } as unknown as REST,
        applicationId: () => APP,
        ...(onDeployed && { onDeployed })
    });
}

describe('CommandRegistry.setCommands', () => {
    it('puts the global bucket to the application commands route and indexes the result by id', async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('123', 'ping'));
        const registry = registryWith(put);
        registry.globalCommands.push(new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'));

        const result = await registry.setCommands();

        expect(put).toHaveBeenCalledOnce();
        expect(put.mock.calls[0]?.[0]).toBe(Routes.applicationCommands(APP));
        expect(result.global.get('123')?.name).toBe('ping');
    });

    it('fires the onDeployed callback with the deploy result', async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('123', 'ping'));
        const onDeployed = vi.fn();
        const registry = registryWith(put, onDeployed);
        registry.globalCommands.push(new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'));

        const result = await registry.setCommands();

        expect(onDeployed).toHaveBeenCalledWith(result);
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
