import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { resolveDeployTarget } from '#src/commands/deployTarget';

import type { CommandMeta } from '#decorators/Command';

function targetFor(meta: CommandMeta, configured: string[]): ReturnType<typeof resolveDeployTarget> {
    return resolveDeployTarget(meta, configured, 'PingCommand');
}

describe('resolveDeployTarget', () => {
    it('sends a command with no scope to the configured guilds', () => {
        expect(targetFor({ scope: 'config' }, ['111'])).toEqual({ scope: 'guild', guilds: ['111'] });
    });

    it('sends a command with no scope global once the configured list empties', () => {
        expect(targetFor({ scope: 'config' }, [])).toEqual({ scope: 'global' });
    });

    it('sends one copy to a guild the configured list repeats', () => {
        expect(targetFor({ scope: 'config' }, ['111', '111'])).toEqual({ scope: 'guild', guilds: ['111'] });
    });

    it('keeps a global command global while the config lists guilds', () => {
        expect(targetFor({ scope: 'global' }, ['111'])).toEqual({ scope: 'global' });
    });

    it('uses the ids the decorator passed, leaving the configured list out', () => {
        expect(targetFor({ scope: 'guild', guilds: ['222'] }, ['111'])).toEqual({
            scope: 'guild',
            guilds: ['222']
        });
    });

    it('expands the config token where it sits in the list', () => {
        expect(targetFor({ scope: 'guild', guilds: ['222', 'config'] }, ['111'])).toEqual({
            scope: 'guild',
            guilds: ['222', '111']
        });
    });

    it('sends one copy to a guild the config and the decorator repeat', () => {
        expect(targetFor({ scope: 'guild', guilds: ['config', '111'] }, ['111'])).toEqual({
            scope: 'guild',
            guilds: ['111']
        });
    });

    it('throws when the config token has no ids behind it', () => {
        let caught: unknown;
        try {
            targetFor({ scope: 'guild', guilds: ['config'] }, []);
        } catch (error) {
            caught = error;
        }

        expect(isSeedcordError(caught, undefined, SeedcordErrorCode.CoreCommandGuildsEmpty)).toBe(true);
    });
});
