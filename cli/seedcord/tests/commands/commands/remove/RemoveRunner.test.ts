import { SeedcordErrorCode } from '@seedcord/errors';
import { Routes } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

import { RemoveRunner } from '#commands/commands/remove/RemoveRunner';
import { GLOBAL_SCOPE } from '#commands/commands/remove/scope';
import { APP_ID, fakeDiscord, slash } from '#tests/commands/commands/fakeBot';

import type { Scope } from '#commands/commands/remove/scope';
import type { REST } from '@discordjs/rest';

const alpha: Scope = { kind: 'guild', id: '111', name: 'Alpha' };

function runnerOn(onDiscord: Record<string, unknown> = {}): ReturnType<typeof fakeDiscord> & { runner: RemoveRunner } {
    const discord = fakeDiscord(onDiscord);
    return { ...discord, runner: new RemoveRunner(() => discord.rest) };
}

describe('RemoveRunner.connect', () => {
    it('returns the app id and the named guilds as given', async () => {
        const { runner } = runnerOn();

        const connected = await runner.connect({ kind: 'named', guilds: [{ id: '111', name: '111' }] }, 'token');

        expect(connected).toEqual({ appId: APP_ID, guilds: [{ id: '111', name: '111' }] });
    });

    it('lists every guild the bot is in, with names, for all guilds', async () => {
        const { runner } = runnerOn({ [Routes.userGuilds()]: [{ id: '111', name: 'Alpha' }] });

        const connected = await runner.connect({ kind: 'all' }, 'token');

        expect(connected.guilds).toEqual([{ id: '111', name: 'Alpha' }]);
    });

    it('returns no guilds when none are targeted', async () => {
        const { runner } = runnerOn();

        await expect(runner.connect({ kind: 'none' }, 'token')).resolves.toEqual({ appId: APP_ID, guilds: [] });
    });

    it('throws CliApplicationUnreadable when the application lookup fails', async () => {
        const { runner } = runnerOn({ [Routes.currentApplication()]: new Error('401') });

        await expect(runner.connect({ kind: 'none' }, 'token')).rejects.toMatchObject({
            code: SeedcordErrorCode.CliApplicationUnreadable
        });
    });
});

describe('RemoveRunner.listBotGuilds', () => {
    it('fetches the next page after the last guild while discord returns full pages', async () => {
        const firstPage = Array.from({ length: 200 }, (_, i) => ({ id: `g${i}`, name: `Guild ${i}` }));
        const get = vi.fn((_route: string, options: { query: URLSearchParams }) =>
            Promise.resolve(options.query.get('after') === 'g199' ? [{ id: 'g200', name: 'Last' }] : firstPage)
        );
        // justified: listBotGuilds calls only get
        const runner = new RemoveRunner(() => ({ get }) as unknown as REST);

        const guilds = await runner.listBotGuilds('token');

        expect(guilds).toHaveLength(201);
        expect(guilds.at(-1)).toEqual({ id: 'g200', name: 'Last' });
    });
});

describe('RemoveRunner.scan', () => {
    it('reads the global commands and each guild, and skips a guild it cannot read', async () => {
        const { runner } = runnerOn({
            [Routes.applicationCommands(APP_ID)]: [slash('ban')],
            [Routes.applicationGuildCommands(APP_ID, '111')]: [slash('ban'), slash('setup')],
            [Routes.applicationGuildCommands(APP_ID, '222')]: new Error('Missing Access')
        });

        const scan = await runner.scan('token', APP_ID, [
            { id: '222', name: 'Beta' },
            { id: '111', name: 'Alpha' }
        ]);

        expect(scan).toEqual({
            global: [slash('ban')],
            guilds: [{ scope: alpha, commands: [slash('ban'), slash('setup')] }],
            skipped: [{ guild: { id: '222', name: 'Beta' }, reason: 'Missing Access' }]
        });
    });
});

describe('RemoveRunner.deleteCommands', () => {
    it('deletes each command through its own scope route, and keeps going past a failure', async () => {
        const failing = Routes.applicationGuildCommand(APP_ID, '111', 'ban-id');
        const { runner, deletes } = runnerOn({ [failing]: new Error('Unknown Command') });

        const result = await runner.deleteCommands('token', APP_ID, [
            { scope: GLOBAL_SCOPE, commands: [slash('ping')] },
            { scope: alpha, commands: [slash('ban'), slash('setup')] }
        ]);

        expect(deletes).toEqual([
            Routes.applicationCommand(APP_ID, 'ping-id'),
            Routes.applicationGuildCommand(APP_ID, '111', 'setup-id')
        ]);
        expect(result).toEqual({
            deleted: 2,
            failed: [{ scope: alpha, command: slash('ban'), reason: 'Unknown Command' }]
        });
    });
});

describe('RemoveRunner.clearScopes', () => {
    it('puts an empty list into each scope and counts the commands it held', async () => {
        const { runner, puts } = runnerOn();

        const result = await runner.clearScopes('token', APP_ID, [
            { scope: GLOBAL_SCOPE, commands: [slash('ping')] },
            { scope: alpha, commands: [slash('ban'), slash('setup')] }
        ]);

        expect(puts).toEqual([
            { route: Routes.applicationCommands(APP_ID), names: [] },
            { route: Routes.applicationGuildCommands(APP_ID, '111'), names: [] }
        ]);
        expect(result).toEqual({ deleted: 3, failed: [] });
    });

    it('records a scope it could not clear and keeps going', async () => {
        const { runner, puts } = runnerOn({ [Routes.applicationCommands(APP_ID)]: new Error('500') });

        const result = await runner.clearScopes('token', APP_ID, [
            { scope: GLOBAL_SCOPE, commands: [slash('ping')] },
            { scope: alpha, commands: [slash('ban')] }
        ]);

        expect(puts).toHaveLength(1);
        expect(result).toEqual({ deleted: 1, failed: [{ scope: GLOBAL_SCOPE, reason: '500' }] });
    });
});
