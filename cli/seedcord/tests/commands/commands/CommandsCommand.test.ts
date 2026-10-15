import { Command } from '@commander-js/extra-typings';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommandsCommand, hasCleanFlags } from '#commands/commands/CommandsCommand';
import { FAKE_TOKEN } from '#tests/commands/build/smoke';

import type { CleanRunner } from '#commands/commands/CleanRunner';
import type { CleanInvocation } from '#commands/commands/CommandsCommand';

const base: CleanInvocation = {
    guild: [],
    allGuilds: false,
    apply: false,
    purge: false,
    yes: false
};

describe('hasCleanFlags', () => {
    it('is false with no flags', () => {
        expect(hasCleanFlags(base)).toBe(false);
    });

    it('is true when only --guild is given, so it never silently no-ops', () => {
        expect(hasCleanFlags({ ...base, guild: ['123'] })).toBe(true);
    });

    it('is true for --apply alone', () => {
        expect(hasCleanFlags({ ...base, apply: true })).toBe(true);
    });

    it('treats --yes alone as no action', () => {
        expect(hasCleanFlags({ ...base, yes: true })).toBe(false);
    });
});

describe('seedcord commands', () => {
    const stdinIsTTY = process.stdin.isTTY;

    beforeEach(() => {
        process.stdin.isTTY = false;
        Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: FAKE_TOKEN }));
    });

    afterEach(() => {
        process.stdin.isTTY = stdinIsTTY;
    });

    function cliWith(runner: Partial<CleanRunner>): Command {
        const program = new Command().exitOverride();
        // justified: a flag-mode clean calls only resolveTargets and scanGuilds
        new CommandsCommand(runner as CleanRunner).register(program);
        return program;
    }

    it('runs clean as a dry run on the guilds passed to it', async () => {
        const resolveTargets = vi.fn().mockResolvedValue({ appId: 'app-1', guilds: [{ id: '1', name: 'one' }] });
        const scanGuilds = vi.fn().mockResolvedValue({
            flagged: [],
            skipped: [],
            scannedGuildCount: 1,
            scannedCommandCount: 0,
            globalCommandCount: 0
        });

        await cliWith({ resolveTargets, scanGuilds }).parseAsync(['commands', 'clean', '--guild', '1'], {
            from: 'user'
        });

        expect(resolveTargets).toHaveBeenCalledWith({ guildIds: ['1'], allGuilds: false, purge: false }, FAKE_TOKEN);
    });
});
