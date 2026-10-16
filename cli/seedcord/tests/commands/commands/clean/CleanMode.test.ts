import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { CleanMode } from '#commands/commands/clean/CleanMode';
import { slash } from '#tests/commands/commands/fakeBot';

import type { Scan } from '#commands/commands/remove/RemoveRunner';
import type { Scope } from '#commands/commands/remove/scope';

const alpha: Scope = { kind: 'guild', id: 'g1', name: 'Alpha' };
const beta: Scope = { kind: 'guild', id: 'g2', name: 'Beta' };

function scan(over: Partial<Scan> = {}): Scan {
    return { global: [slash('ban')], guilds: [], skipped: [], ...over };
}

describe('CleanMode', () => {
    const clean = new CleanMode();

    it('throws CliCleanNoGuilds when no guild is targeted', () => {
        expect(() => clean.checkTargets({ kind: 'none' })).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CliCleanNoGuilds })
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

    it('says when every guild it asked for failed to read', () => {
        const message = clean.nothingToRemove(
            scan({ skipped: [{ guild: { id: 'g1', name: 'Alpha' }, reason: '403' }] })
        );

        expect(message.outro).toBe('Could not read any of the 1 guild, nothing was scanned.');
    });

    it('says the scanned guilds hold no commands', () => {
        const message = clean.nothingToRemove(scan({ guilds: [{ scope: alpha, commands: [] }] }));

        expect(message.outro).toBe('Scanned 1 guild with no guild commands deployed. Nothing to clean.');
    });

    it('points at purge when the app has no global commands', () => {
        const message = clean.nothingToRemove(
            scan({ global: [], guilds: [{ scope: alpha, commands: [slash('setup')] }] })
        );

        expect(message.info).toEqual([
            'This app has no global commands, so nothing can duplicate one.',
            'Run seedcord commands purge to delete every command instead.'
        ]);
    });

    it('counts what it scanned when nothing duplicates a global command', () => {
        const message = clean.nothingToRemove(scan({ guilds: [{ scope: alpha, commands: [slash('setup')] }] }));

        expect(message.info[0]).toBe('Scanned 1 guild command across 1 guild. None duplicate a global command.');
    });
});
