import { SeedcordErrorCode } from '@seedcord/errors';
import { Routes } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { DiscordSession } from '#commands/commands/DiscordSession';
import { GLOBAL_SCOPE } from '#commands/commands/scope';
import { APP_ID, fakeDiscord, slash } from '#tests/commands/commands/fakeBot';

import type { Scope } from '#commands/commands/scope';

const alpha: Scope = { kind: 'guild', id: '111', name: 'Alpha' };

async function sessionOn(
    onDiscord: Record<string, unknown> = {}
): Promise<ReturnType<typeof fakeDiscord> & { session: DiscordSession }> {
    const discord = fakeDiscord(onDiscord);
    return { ...discord, session: await DiscordSession.open(discord.rest) };
}

describe('DiscordSession.open', () => {
    it('reads the app id', async () => {
        const { session } = await sessionOn();

        expect(session.appId).toBe(APP_ID);
    });

    it('throws CoreDiscordReadFailed when the application lookup fails', async () => {
        const { rest } = fakeDiscord({ [Routes.currentApplication()]: new Error('401') });

        await expect(DiscordSession.open(rest)).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreDiscordReadFailed
        });
    });
});

describe('DiscordSession.guildsOf', () => {
    it('reads the name of each named guild, and keeps the id when the guild cannot be read', async () => {
        const { session } = await sessionOn({ [Routes.guild('222')]: new Error('Missing Access') });

        const guilds = await session.guildsOf({ kind: 'named', ids: ['111', '222'] });

        expect(guilds).toEqual([
            { id: '111', name: 'Alpha' },
            { id: '222', name: '222' }
        ]);
    });

    it('lists every guild the bot is in for all guilds', async () => {
        const { session } = await sessionOn({ [Routes.userGuilds()]: [{ id: '111', name: 'Alpha' }] });

        await expect(session.guildsOf({ kind: 'all' })).resolves.toEqual([{ id: '111', name: 'Alpha' }]);
    });
});

describe('DiscordSession.readScopes', () => {
    it('reads the global commands and each guild in the order asked', async () => {
        const { session } = await sessionOn({
            [Routes.applicationCommands(APP_ID)]: [slash('ban')],
            [Routes.applicationGuildCommands(APP_ID, '111')]: [slash('ban'), slash('setup')],
            [Routes.applicationGuildCommands(APP_ID, '222')]: [slash('rank')]
        });

        const scan = await session.readScopes([
            { id: '222', name: 'Beta' },
            { id: '111', name: 'Alpha' }
        ]);

        expect(scan).toEqual({
            global: [slash('ban')],
            guilds: [
                { scope: { kind: 'guild', id: '222', name: 'Beta' }, commands: [slash('rank')] },
                { scope: alpha, commands: [slash('ban'), slash('setup')] }
            ]
        });
    });

    it('throws CoreDiscordReadFailed on a guild it cannot read', async () => {
        const { session } = await sessionOn({
            [Routes.applicationGuildCommands(APP_ID, '222')]: new Error('Missing Access')
        });

        const scan = session.readScopes([
            { id: '111', name: 'Alpha' },
            { id: '222', name: 'Beta' }
        ]);

        await expect(scan).rejects.toMatchObject({ code: SeedcordErrorCode.CoreDiscordReadFailed });
        await expect(scan).rejects.toThrow('222');
    });
});

describe('DiscordSession.deleteCommands', () => {
    it('deletes each command through its own scope route, and keeps going past a failure', async () => {
        const failing = Routes.applicationGuildCommand(APP_ID, '111', 'ban-id');
        const { session, deletes } = await sessionOn({ [failing]: new Error('Unknown Command') });

        const result = await session.deleteCommands([
            { scope: GLOBAL_SCOPE, commands: [slash('ping')] },
            { scope: alpha, commands: [slash('ban'), slash('setup')] }
        ]);

        expect(deletes).toEqual([
            Routes.applicationCommand(APP_ID, 'ping-id'),
            Routes.applicationGuildCommand(APP_ID, '111', 'setup-id')
        ]);
        expect(result).toEqual({
            deleted: 2,
            failed: [{ kind: 'command', scope: alpha, command: slash('ban'), reason: 'Unknown Command' }]
        });
    });
});

describe('DiscordSession.clearScopes', () => {
    it('puts an empty list into each scope and counts the commands it held', async () => {
        const { session, puts } = await sessionOn();

        const result = await session.clearScopes([
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
        const { session, puts } = await sessionOn({ [Routes.applicationCommands(APP_ID)]: new Error('500') });

        const result = await session.clearScopes([
            { scope: GLOBAL_SCOPE, commands: [slash('ping')] },
            { scope: alpha, commands: [slash('ban')] }
        ]);

        expect(puts).toEqual([{ route: Routes.applicationGuildCommands(APP_ID, '111'), names: [] }]);
        expect(result).toEqual({ deleted: 1, failed: [{ kind: 'scope', scope: GLOBAL_SCOPE, reason: '500' }] });
    });
});
