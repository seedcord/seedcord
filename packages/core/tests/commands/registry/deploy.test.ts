import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { SeedcordErrorCode } from '@seedcord/errors';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { ApplicationCommandType, Routes } from 'discord-api-types/v10';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { setDevChannel } from '#hmr/devChannel';
import { Commands } from '#src/commands/CommandInjector';
import { CommandRegistry } from '#src/commands/CommandRegistry';
import { Bus } from '#subscribers/Bus';

import type { CoreBase } from '#interfaces/CoreBase';
import type { CommandInfo } from '#src/commands/CommandInjector';
import type { CommandBuilder } from '#src/commands/types';
import type { DeployedHashes } from '@seedcord/types/internal';
import type { APIApplicationCommand } from 'discord-api-types/v10';
import type { Mock } from 'vitest';

// justified: SlashRegistry is empty in tests
const mentions = Commands as Record<string, CommandInfo>;

const FIXTURE = path.join(import.meta.dirname, 'fixtures', 'commands');

const APP = 'app-1';
const BARE: APIApplicationCommand[] = [
    // justified: the deploy reads only these three fields
    { id: '1', name: 'bare', type: ApplicationCommandType.ChatInput } as APIApplicationCommand
];
// a new id proves a later deploy injected what it read or put
const BARE_AGAIN: APIApplicationCommand[] = [
    // justified: the deploy reads only these three fields
    { id: '2', name: 'bare', type: ApplicationCommandType.ChatInput } as APIApplicationCommand
];

function coreWith(put: Mock, get: Mock = vi.fn().mockResolvedValue(BARE), guilds?: string[]): CoreBase {
    // justified: deploy reads only these members off core
    const core = {
        config: { bot: { commands: { path: FIXTURE, guilds } } },
        rest: { put, get, on: vi.fn(), off: vi.fn() },
        applicationId: APP
    } as unknown as { bus: Bus };
    core.bus = new Bus(core as unknown as CoreBase);
    return core as unknown as CoreBase;
}

function registryWith(put: Mock, get?: Mock): CommandRegistry {
    return new CommandRegistry(coreWith(put, get));
}

// what a first deploy of the fixture sends seedcord dev to save
async function deployedOnce(): Promise<DeployedHashes> {
    const { sent } = cliWith(undefined);
    await registryWith(vi.fn().mockResolvedValue(BARE)).deploy(new AbortController().signal, {});
    const [, saved] = sent.findLast(([event]) => event === 'seedcord:commands-deployed') ?? [];
    // justified: the registry sends DeployedHashes on seedcord:commands-deployed
    return saved as DeployedHashes;
}

// discord, where guild 111 is called `name`
function guildNamed(name: string): Mock {
    return vi.fn((route: string) => Promise.resolve(route === Routes.guild('111') ? { id: '111', name } : BARE));
}

function captureLogs(messages: string[]): Disposable {
    return LoggerChannelRegistry.instance.installSink({
        kind: 'capture',
        onLog: (record) => messages.push(stripVTControlCharacters(record.message))
    });
}

interface FakeCli {
    sent: [string, unknown][];
    listening: () => string[];
}

// seedcord dev, answering the registry's read with the last deploy
function cliWith(deployed: DeployedHashes | undefined): FakeCli {
    const sent: [string, unknown][] = [];
    const handlers = new Map<string, (data: unknown) => void>();
    setDevChannel({
        send: (event, data) => {
            sent.push([event, data]);
            if (event === 'seedcord:read-deployed') handlers.get('seedcord:last-deploy')?.({ deployed });
        },
        // justified: the fake keeps every handler under one signature
        on: (event, handler) => handlers.set(event, handler as (data: unknown) => void),
        off: (event) => handlers.delete(event)
    });
    onTestFinished(() => setDevChannel(undefined));
    return { sent, listening: () => [...handlers.keys()] };
}

// a dev channel where nothing answers the read
function silentCli(onRead: () => void): Pick<FakeCli, 'listening'> {
    const listening = new Set<string>();
    setDevChannel({
        send: (event) => {
            if (event === 'seedcord:read-deployed') onRead();
        },
        on: (event) => listening.add(event),
        off: (event) => listening.delete(event)
    });
    onTestFinished(() => setDevChannel(undefined));
    return { listening: () => [...listening] };
}

describe('CommandRegistry.deploy', () => {
    it('checks the deployed routes against the handlers', async () => {
        const put = vi.fn().mockResolvedValue([{ id: '1', name: 'bare', type: ApplicationCommandType.ChatInput }]);
        const routes = { warnUnhandledRoutes: vi.fn(), warnUnhandledContextMenuRoutes: vi.fn() };

        await registryWith(put).deploy(new AbortController().signal, { routes });

        expect([...(routes.warnUnhandledRoutes.mock.calls[0]?.[0] as Iterable<string>)]).toEqual(['bare']);
        expect(routes.warnUnhandledContextMenuRoutes).toHaveBeenCalledWith({ user: new Set(), message: new Set() });
    });

    it('sends nothing to discord when the check throws', async () => {
        const put = vi.fn().mockResolvedValue([]);
        const check = vi.fn((_commands: CommandBuilder[]) => {
            throw new Error('needs the Guilds intent');
        });

        await expect(registryWith(put).deploy(new AbortController().signal, { check })).rejects.toThrow('Guilds');

        expect(check.mock.calls[0]?.[0].map((command) => command.name)).toEqual(['bare']);
        expect(put).not.toHaveBeenCalled();
    });

    it('reads the ids of a scope whose commands match the last deploy and puts nothing', async () => {
        cliWith(await deployedOnce());
        const put = vi.fn();
        const get = vi.fn().mockResolvedValue(BARE_AGAIN);

        await registryWith(put, get).deploy(new AbortController().signal, {});

        expect(put).not.toHaveBeenCalled();
        expect(get.mock.calls.map(([route]: unknown[]) => route)).toEqual([Routes.applicationCommands(APP)]);
        expect(mentions.bare?.mention).toBe('</bare:2>');
    });

    it('deploys an unchanged scope again when discord is missing one of its commands', async () => {
        cliWith(await deployedOnce());
        const put = vi.fn().mockResolvedValue(BARE_AGAIN);

        await registryWith(put, vi.fn().mockResolvedValue([])).deploy(new AbortController().signal, {});

        expect(put.mock.calls.map(([route]: unknown[]) => route)).toEqual([Routes.applicationCommands(APP)]);
        expect(mentions.bare?.mention).toBe('</bare:2>');
    });

    it('publishes only what a redeploy left on discord', async () => {
        cliWith(await deployedOnce());
        // justified: the deploy reads only these three fields
        const stray = { id: '9', name: 'stray', type: ApplicationCommandType.ChatInput } as APIApplicationCommand;
        const core = coreWith(vi.fn().mockResolvedValue(BARE), vi.fn().mockResolvedValue([...BARE, stray]));
        const heard = vi.fn();
        core.bus.on('commandsDeployed', heard);

        await new CommandRegistry(core).deploy(new AbortController().signal, {});

        expect(heard).toHaveBeenCalledWith({ global: BARE, guilds: {} });
    });

    it('throws CoreDiscordReadFailed when an unchanged scope cannot be read back', async () => {
        cliWith(await deployedOnce());
        const get = vi.fn().mockRejectedValue(new Error('Missing Access'));

        const deploying = registryWith(vi.fn(), get).deploy(new AbortController().signal, {});

        await expect(deploying).rejects.toMatchObject({ code: SeedcordErrorCode.CoreDiscordReadFailed });
        await expect(deploying).rejects.toThrow('Missing Access');
    });

    it('forgets the hash of a scope whose put fails', async () => {
        const { sent } = cliWith(await deployedOnce());
        const put = vi.fn().mockRejectedValue(new Error('Internal Server Error'));

        const deploying = registryWith(put, vi.fn().mockResolvedValue([])).deploy(new AbortController().signal, {});

        await expect(deploying).rejects.toMatchObject({ code: SeedcordErrorCode.CoreCommandGlobalDeployFailed });
        expect(sent.findLast(([event]) => event === 'seedcord:commands-deployed')).toEqual([
            'seedcord:commands-deployed',
            { applicationId: APP, scopes: {} }
        ]);
    });

    it('asks seedcord dev for the last deploy of its application, then sends what it deployed', async () => {
        const deployed = await deployedOnce();
        const { sent } = cliWith(undefined);

        await registryWith(vi.fn().mockResolvedValue(BARE)).deploy(new AbortController().signal, {});

        expect(sent).toEqual([
            ['seedcord:read-deployed', { applicationId: APP }],
            ['seedcord:commands-deployed', { applicationId: APP, scopes: {} }],
            ['seedcord:commands-deployed', deployed]
        ]);
    });

    it('deploys every scope when seedcord dev never answers', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        onTestFinished(() => {
            vi.useRealTimers();
        });
        const cli = silentCli(() => {
            queueMicrotask(() => {
                vi.runOnlyPendingTimers();
            });
        });
        const put = vi.fn().mockResolvedValue(BARE);

        await registryWith(put).deploy(new AbortController().signal, {});

        expect(put.mock.calls.map(([route]: unknown[]) => route)).toEqual([Routes.applicationCommands(APP)]);
        expect(cli.listening()).not.toContain('seedcord:last-deploy');
    });

    it('stops listening for seedcord dev once it answers', async () => {
        const cli = cliWith(undefined);

        await registryWith(vi.fn().mockResolvedValue(BARE)).deploy(new AbortController().signal, {});

        expect(cli.listening()).not.toContain('seedcord:last-deploy');
    });

    it('rejects when the deploy is aborted while it waits for seedcord dev', async () => {
        const controller = new AbortController();
        silentCli(() => controller.abort());

        const deploying = registryWith(vi.fn()).deploy(controller.signal, {});

        await expect(deploying).rejects.toThrow(expect.objectContaining({ name: 'AbortError' }));
    });

    it('logs a guild by its name under seedcord dev, which it reads from discord once', async () => {
        cliWith(undefined);
        const get = guildNamed('Alpha');
        const registry = new CommandRegistry(coreWith(vi.fn().mockResolvedValue(BARE), get, ['111']));
        const messages: string[] = [];
        using _capture = captureLogs(messages);

        await registry.deploy(new AbortController().signal, {});
        await registry.setCommands();

        expect(messages).toContainEqual(expect.stringContaining('Deployed 1 command to Alpha'));
        expect(messages).toContain('Skipped the commands in Alpha because they match the last deploy.');
        expect(get.mock.calls.filter(([route]) => route === Routes.guild('111'))).toHaveLength(1);
    });

    it('rejects when the deploy is aborted while it reads a guild name', async () => {
        cliWith(undefined);
        const controller = new AbortController();
        const get = vi.fn((route: string) => {
            if (route !== Routes.guild('111')) return Promise.resolve(BARE);
            controller.abort();
            return new Promise(() => undefined);
        });
        const registry = new CommandRegistry(coreWith(vi.fn().mockResolvedValue(BARE), get, ['111']));

        await expect(registry.deploy(controller.signal, {})).rejects.toThrow(
            expect.objectContaining({ name: 'AbortError' })
        );
    });

    it('logs a guild by its id outside seedcord dev, and reads no guild', async () => {
        const get = guildNamed('Alpha');
        const registry = new CommandRegistry(coreWith(vi.fn().mockResolvedValue(BARE), get, ['111']));
        const messages: string[] = [];
        using _capture = captureLogs(messages);

        await registry.deploy(new AbortController().signal, {});

        expect(messages).toContainEqual(expect.stringContaining('Deployed 1 command to 111'));
        expect(get).not.toHaveBeenCalledWith(Routes.guild('111'));
    });

    it('skips the put on a refresh that changed no command', async () => {
        const put = vi.fn().mockResolvedValue(BARE);
        const registry = registryWith(put);
        await registry.deploy(new AbortController().signal, {});

        await registry.setCommands();

        expect(put).toHaveBeenCalledOnce();
    });
});
