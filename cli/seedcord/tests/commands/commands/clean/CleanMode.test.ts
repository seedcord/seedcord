import { SeedcordErrorCode } from '@seedcord/errors';
import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { CleanMode } from '#commands/commands/clean/CleanMode';
import { slash } from '#tests/commands/commands/fakeBot';

import type { Scan } from '#commands/commands/DiscordSession';
import type { GuildScope } from '#commands/commands/scope';

const alpha: GuildScope = { kind: 'guild', id: 'g1', name: 'Alpha' };
const beta: GuildScope = { kind: 'guild', id: 'g2', name: 'Beta' };

function scan(over: Partial<Scan> = {}): Scan {
    return { global: [slash('ban')], guilds: [], ...over };
}

describe('CleanMode', () => {
    const clean = new CleanMode();

    it('throws CliNoScopeGiven when no guild is targeted', () => {
        expect(() => clean.assertTargets({ kind: 'none' })).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CliNoScopeGiven })
        );
    });

    it('picks the guild commands that share a global command name, and leaves out guilds with none', () => {
        const selected = clean.select(
            scan({
                guilds: [
                    { scope: alpha, commands: [slash('ban'), slash('setup')] },
                    { scope: beta, commands: [slash('setup')] }
                ]
            })
        );

        expect(selected).toEqual([{ scope: alpha, commands: [slash('ban')] }]);
    });

    it('leaves a guild context menu alone when only a global slash command shares its name', () => {
        const userMenu = { ...slash('ban'), id: 'menu-id', type: ApplicationCommandType.User };

        const selected = clean.select(scan({ guilds: [{ scope: alpha, commands: [userMenu] }] }));

        expect(selected).toEqual([]);
    });

    it('says the scanned guilds hold no commands', () => {
        const message = clean.nothingToRemove(scan({ guilds: [{ scope: alpha, commands: [] }] }));

        expect(message.outro).toBe('Scanned 1 guild with no guild commands deployed. Nothing to clean.');
    });

    it('says the app has no global commands when it has none', () => {
        const message = clean.nothingToRemove(
            scan({ global: [], guilds: [{ scope: alpha, commands: [slash('setup')] }] })
        );

        expect(message.info[0]).toBe('This app has no global commands, so nothing can duplicate one.');
    });

    it('counts what it scanned when nothing duplicates a global command', () => {
        const message = clean.nothingToRemove(scan({ guilds: [{ scope: alpha, commands: [slash('setup')] }] }));

        expect(message.info[0]).toBe('Scanned 1 guild command across 1 guild. None duplicate a global command.');
    });
});
