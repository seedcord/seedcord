import path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { ApplicationCommandType, Routes } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

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

// justified: SlashRegistry is empty in tests
const mentions = Commands as Record<string, CommandInfo>;

const FIXTURE = path.join(import.meta.dirname, 'fixtures', 'commands');

const APP = 'app-1';
const BARE: APIApplicationCommand[] = [
    // justified: the deploy reads only these three fields
    { id: '1', name: 'bare', type: ApplicationCommandType.ChatInput } as APIApplicationCommand
];

function registryWith(put: ReturnType<typeof vi.fn>, get = vi.fn().mockResolvedValue(BARE)): CommandRegistry {
    // justified: deploy reads only these members off core
    const core = {
        config: { bot: { commands: { path: FIXTURE } } },
        rest: { put, get, on: vi.fn(), off: vi.fn() },
        applicationId: APP
    } as unknown as { bus: Bus };
    core.bus = new Bus(core as unknown as CoreBase);
    return new CommandRegistry(core as unknown as CoreBase);
}

// what a first deploy of the fixture puts, as seedcord dev would cache it
async function deployedOnce(applicationId = APP): Promise<DeployedHashes> {
    const put = vi.fn().mockResolvedValue(BARE);
    await registryWith(put).deploy(new AbortController().signal, {});
    const { body } = put.mock.calls[0]?.[1] as { body: CommandBody[] };
    return { applicationId, ...(await scopeHashes({ global: body, guilds: new Map() })) };
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
        const deployed = await deployedOnce();
        const put = vi.fn();
        const get = vi.fn().mockResolvedValue(BARE);

        await registryWith(put, get).deploy(new AbortController().signal, { deployed });

        expect(put).not.toHaveBeenCalled();
        expect(get.mock.calls.map(([route]: unknown[]) => route)).toEqual([Routes.applicationCommands(APP)]);
        expect(mentions.bare?.mention).toBe('</bare:1>');
    });

    it('throws CoreDiscordReadFailed when an unchanged scope cannot be read back', async () => {
        const deployed = await deployedOnce();
        const get = vi.fn().mockRejectedValue(new Error('Missing Access'));

        const deploying = registryWith(vi.fn(), get).deploy(new AbortController().signal, { deployed });

        await expect(deploying).rejects.toMatchObject({ code: SeedcordErrorCode.CoreDiscordReadFailed });
        await expect(deploying).rejects.toThrow('Missing Access');
    });

    it('puts every scope when the last deploy was for another application', async () => {
        const deployed = await deployedOnce('app-2');
        const put = vi.fn().mockResolvedValue(BARE);

        await registryWith(put).deploy(new AbortController().signal, { deployed });

        expect(put.mock.calls.map(([route]: unknown[]) => route)).toEqual([Routes.applicationCommands(APP)]);
    });

    it('skips the put on a refresh that changed no command', async () => {
        const put = vi.fn().mockResolvedValue(BARE);
        const registry = registryWith(put);
        await registry.deploy(new AbortController().signal, {});

        await registry.setCommands();

        expect(put).toHaveBeenCalledOnce();
    });
});
