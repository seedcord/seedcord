import { Command } from '@commander-js/extra-typings';
import { ApplicationCommandType } from 'discord-api-types/v10';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommandsCommand, hasCleanFlags } from '#commands/commands/CommandsCommand';
import { LARGE_BOT_THRESHOLD } from '#commands/commands/executeClean';
import { FAKE_TOKEN } from '#tests/commands/build/smoke';

import type { Flagged } from '#commands/commands/classify';
import type { CleanOps, CleanRunner, GuildSummary } from '#commands/commands/CleanRunner';
import type { CleanInvocation } from '#commands/commands/CommandsCommand';
import type { Mock } from 'vitest';

const base: CleanInvocation = {
    guild: [],
    allGuilds: false,
    apply: false,
    purge: false
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
});

const DUPLICATE: Flagged = {
    id: '11',
    name: 'ban',
    type: ApplicationCommandType.ChatInput,
    guildId: '1',
    guildName: 'one',
    reason: 'overlap'
};

function fakeRunner(guilds: GuildSummary[] = [{ id: '1', name: 'one' }]): Record<keyof CleanOps, Mock> {
    return {
        resolveTargets: vi.fn().mockResolvedValue({ appId: 'app-1', guilds }),
        scanGuilds: vi.fn().mockResolvedValue({
            flagged: [DUPLICATE],
            skipped: [],
            scannedGuildCount: guilds.length,
            scannedCommandCount: 1,
            globalCommandCount: 1
        }),
        applyDeletions: vi.fn().mockResolvedValue({ deleted: 1, failed: [] })
    };
}

async function run(runner: Record<keyof CleanOps, Mock>, ...args: string[]): Promise<void> {
    const program = new Command().exitOverride();
    // justified: flag mode calls only the CleanOps methods
    new CommandsCommand(runner as unknown as CleanRunner).register(program);
    await program.parseAsync(['commands', ...args], { from: 'user' });
}

describe('seedcord commands clean, off a terminal', () => {
    const stdinIsTTY = process.stdin.isTTY;

    beforeEach(() => {
        process.stdin.isTTY = false;
        Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: FAKE_TOKEN }));
    });

    afterEach(() => {
        process.stdin.isTTY = stdinIsTTY;
    });

    it('lists the duplicates in the guilds passed to it and deletes nothing', async () => {
        const runner = fakeRunner();

        await run(runner, 'clean', '--guild', '1');

        expect(runner.resolveTargets).toHaveBeenCalledWith(
            { guildIds: ['1'], allGuilds: false, purge: false },
            FAKE_TOKEN
        );
        expect(runner.applyDeletions).not.toHaveBeenCalled();
    });

    it('deletes the duplicates with --apply and asks nothing', async () => {
        const runner = fakeRunner();

        await run(runner, 'clean', '--guild', '1', '--apply');

        expect(runner.applyDeletions).toHaveBeenCalledWith(FAKE_TOKEN, 'app-1', [DUPLICATE]);
    });

    it('scans every guild with --all-guilds, however many the bot is in', async () => {
        const guilds = Array.from({ length: LARGE_BOT_THRESHOLD + 1 }, (_, i) => ({ id: String(i), name: String(i) }));
        const runner = fakeRunner(guilds);

        await run(runner, 'clean', '--all-guilds');

        expect(runner.scanGuilds).toHaveBeenCalledOnce();
    });
});
