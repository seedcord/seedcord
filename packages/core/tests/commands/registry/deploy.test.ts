import path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { ApplicationCommandType, Routes } from 'discord-api-types/v10';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { setDevChannel } from '#hmr/devChannel';
import { Commands } from '#src/commands/CommandInjector';
import { CommandRegistry } from '#src/commands/CommandRegistry';
import { scopeHashes } from '#src/commands/scopeHashes';
import { Bus } from '#subscribers/Bus';

import type { CoreBase } from '#interfaces/CoreBase';
import type { CommandInfo } from '#src/commands/CommandInjector';
import type { CommandBody } from '#src/commands/putCommands';
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

function coreWith(put: Mock, get: Mock = vi.fn().mockResolvedValue(BARE)): CoreBase {
    // justified: deploy reads only these members off core
    const core = {
        config: { bot: { commands: { path: FIXTURE } } },
        rest: { put, get, on: vi.fn(), off: vi.fn() },
        applicationId: APP
    } as unknown as { bus: Bus };
    core.bus = new Bus(core as unknown as CoreBase);
    return core as unknown as CoreBase;
}

function registryWith(put: Mock, get?: Mock): CommandRegistry {
    return new CommandRegistry(coreWith(put, get));
}

// what a first deploy of the fixture puts, as seedcord dev would cache it
async function deployedOnce(): Promise<DeployedHashes> {
    const applicationId = APP;
    const put = vi.fn().mockResolvedValue(BARE);
    await registryWith(put).deploy(new AbortController().signal, {});
    const { body } = put.mock.calls[0]?.[1] as { body: CommandBody[] };
    return { applicationId, ...(await scopeHashes({ global: body, guilds: new Map() })) };
}

// seedcord dev, answering the registry's read with the last deploy
function cliWith(deployed: DeployedHashes | undefined): [string, unknown][] {
    const sent: [string, unknown][] = [];
    const handlers = new Map<string, (data: unknown) => void>();
    setDevChannel({
        send: (event, data) => {
            sent.push([event, data]);
            if (event === 'seedcord:read-deployed') handlers.get('seedcord:deployed')?.({ deployed });
        },
        // justified: the fake keeps every handler under one signature
        on: (event, handler) => handlers.set(event, handler as (data: unknown) => void)
    });
    onTestFinished(() => setDevChannel(undefined));
    return sent;
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
        const get = vi.fn().mockResolvedValue(BARE);

        await registryWith(put, get).deploy(new AbortController().signal, {});

        expect(put).not.toHaveBeenCalled();
        expect(get.mock.calls.map(([route]: unknown[]) => route)).toEqual([Routes.applicationCommands(APP)]);
        expect(mentions.bare?.mention).toBe('</bare:1>');
    });

    it('deploys an unchanged scope again when discord is missing one of its commands', async () => {
        cliWith(await deployedOnce());
        const put = vi.fn().mockResolvedValue(BARE);

        await registryWith(put, vi.fn().mockResolvedValue([])).deploy(new AbortController().signal, {});

        expect(put.mock.calls.map(([route]: unknown[]) => route)).toEqual([Routes.applicationCommands(APP)]);
        expect(mentions.bare?.mention).toBe('</bare:1>');
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

    it('asks seedcord dev for the last deploy of its application, then sends what it deployed', async () => {
        const deployed = await deployedOnce();
        const sent = cliWith(undefined);

        await registryWith(vi.fn().mockResolvedValue(BARE)).deploy(new AbortController().signal, {});

        expect(sent).toEqual([
            ['seedcord:read-deployed', { applicationId: APP }],
            ['seedcord:commands-deployed', deployed]
        ]);
    });

    it('skips the put on a refresh that changed no command', async () => {
        const put = vi.fn().mockResolvedValue(BARE);
        const registry = registryWith(put);
        await registry.deploy(new AbortController().signal, {});

        await registry.setCommands();

        expect(put).toHaveBeenCalledOnce();
    });
});
