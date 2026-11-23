import { EventEmitter } from 'node:events';

import { SlashCommandBuilder } from '@discordjs/builders';
import { HostPlugins } from '@seedcord/types/internal';
import { ApplicationCommandType, Routes } from 'discord-api-types/v10';
import { describe, it, expect, vi } from 'vite-plus/test';

import { Commands } from '#src/commands/CommandInjector';
import { CommandRegistry } from '#src/commands/CommandRegistry';
import { GLOBAL_ID } from '#src/commands/scopes';
import { Bus } from '#subscribers/Bus';

import type { CoreBase } from '#interfaces/CoreBase';
import type { CommandInfo } from '#src/commands/CommandInjector';
import type { CommandBody } from '#src/commands/putCommands';
import type { APIApplicationCommand } from 'discord-api-types/v10';

const APP = 'app-1';

// justified: SlashRegistry is empty in tests
const mentions = Commands as Record<string, CommandInfo>;

function deployedAs(id: string, name: string): APIApplicationCommand[] {
    // justified: mentions read only these three fields
    return [{ id, name, type: ApplicationCommandType.ChatInput } as APIApplicationCommand];
}

function coreWith(
    put: ReturnType<typeof vi.fn>,
    prepareCommands: (commands: readonly CommandBody[]) => void = () => undefined
): CoreBase {
    // justified: the registry reads only these members off core
    const core = {
        config: { bot: { commands: { path: 'commands' } } },
        rest: Object.assign(new EventEmitter(), { put }),
        applicationId: APP,
        [HostPlugins]: { prepareCommands }
    } as unknown as { bus: Bus };
    core.bus = new Bus(core as unknown as CoreBase);
    return core as unknown as CoreBase;
}

function registryWith(put: ReturnType<typeof vi.fn>): CommandRegistry {
    return new CommandRegistry(coreWith(put));
}

describe('CommandRegistry.setCommands', () => {
    it('hands prepareCommands each command once and sends what it wrote to every scope', async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('123', 'ping'));
        const prepare = vi.fn((commands: readonly CommandBody[]) => {
            for (const command of commands) command.name_localizations = { pl: 'pong' };
        });
        const registry = new CommandRegistry(coreWith(put, prepare));
        const ping = new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!');
        registry.scopedCommands.set(GLOBAL_ID, [ping]);
        registry.scopedCommands.set('111', [ping]);

        await registry.setCommands();

        expect(prepare).toHaveBeenCalledOnce();
        expect(prepare.mock.calls[0]?.[0]).toHaveLength(1);
        expect(put.mock.calls.map(([, options]) => (options as { body: CommandBody[] }).body[0])).toEqual([
            expect.objectContaining({ name_localizations: { pl: 'pong' } }),
            expect.objectContaining({ name_localizations: { pl: 'pong' } })
        ]);
    });

    it('links the command under the name prepareCommands gave it', async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('123', 'pong'));
        const rename = (commands: readonly CommandBody[]): void => {
            for (const command of commands) command.name = 'pong';
        };
        const registry = new CommandRegistry(coreWith(put, rename));
        registry.scopedCommands.set(GLOBAL_ID, [
            new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!')
        ]);

        await registry.setCommands();

        expect(mentions.pong?.mention).toBe('</pong:123>');
    });

    it('hands the abort signal to every put', async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('123', 'ping'));
        const registry = registryWith(put);
        registry.scopedCommands.set(GLOBAL_ID, [
            new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!')
        ]);
        registry.scopedCommands.set('111', [new SlashCommandBuilder().setName('config').setDescription('Config')]);
        const { signal } = new AbortController();

        await registry.setCommands(signal);

        expect(put.mock.calls.map(([, options]) => (options as { signal?: AbortSignal }).signal)).toEqual([
            signal,
            signal
        ]);
    });

    it('publishes commandsDeployed with what discord returned', async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('123', 'ping'));
        const core = coreWith(put);
        const registry = new CommandRegistry(core);
        registry.scopedCommands.set(GLOBAL_ID, [
            new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!')
        ]);
        const heard = vi.fn();
        core.bus.on('commandsDeployed', heard);

        await registry.setCommands();

        expect(heard).toHaveBeenCalledWith({ global: [expect.objectContaining({ id: '123' })], guilds: {} });
    });

    it('keys the published guild result by guild id', async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('g-1', 'config'));
        const core = coreWith(put);
        const registry = new CommandRegistry(core);
        registry.scopedCommands.set('111', [new SlashCommandBuilder().setName('config').setDescription('Config')]);
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
        registry.scopedCommands.set(GLOBAL_ID, [
            new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!')
        ]);

        await registry.setCommands();

        expect(mentions.ping?.mention).toBe('</ping:123>');
    });

    it("puts only the guild route when the bot doesn't have global commands", async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('g-1', 'config'));
        const registry = registryWith(put);
        registry.scopedCommands.set('111', [new SlashCommandBuilder().setName('config').setDescription('Config')]);

        await registry.setCommands();

        expect(put.mock.calls.map(([route]: unknown[]) => route)).toEqual([
            Routes.applicationGuildCommands(APP, '111')
        ]);
        expect(mentions.config?.mention).toBe('</config:g-1>');
    });

    it('sends the built command json as the put body', async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('123', 'ping'));
        const registry = registryWith(put);
        registry.scopedCommands.set(GLOBAL_ID, [
            new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!')
        ]);

        await registry.setCommands();

        const { body } = put.mock.calls[0]?.[1] as { body: { name: string }[] };
        expect(body).toHaveLength(1);
        expect(body[0]?.name).toBe('ping');
    });
});
