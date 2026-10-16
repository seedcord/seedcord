import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { PurgeMode } from '#commands/commands/purge/PurgeMode';
import { GLOBAL_SCOPE } from '#commands/commands/scope';
import { slash } from '#tests/commands/commands/fakeBot';

import type { Scan } from '#commands/commands/DiscordSession';
import type { GuildScope } from '#commands/commands/scope';

const alpha: GuildScope = { kind: 'guild', id: 'g1', name: 'Alpha' };
const beta: GuildScope = { kind: 'guild', id: 'g2', name: 'Beta' };

const scan: Scan = {
    global: [slash('ping')],
    guilds: [
        { scope: alpha, commands: [slash('ban'), slash('setup')] },
        { scope: beta, commands: [] }
    ]
};

describe('PurgeMode', () => {
    it('throws CliNoScopeGiven with no guilds and no global', () => {
        expect(() => new PurgeMode(false).assertTargets({ kind: 'none' })).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CliNoScopeGiven })
        );
    });

    it('accepts global on its own', () => {
        expect(() => new PurgeMode(true).assertTargets({ kind: 'none' })).not.toThrow();
    });

    it('picks every command in each guild that has some', () => {
        expect(new PurgeMode(false).select(scan)).toEqual([{ scope: alpha, commands: [slash('ban'), slash('setup')] }]);
    });

    it('puts the global commands first when global is included', () => {
        expect(new PurgeMode(true).select(scan)).toEqual([
            { scope: GLOBAL_SCOPE, commands: [slash('ping')] },
            { scope: alpha, commands: [slash('ban'), slash('setup')] }
        ]);
    });
});
