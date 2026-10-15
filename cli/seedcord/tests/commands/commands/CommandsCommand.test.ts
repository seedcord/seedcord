import { stripVTControlCharacters } from 'node:util';

import { Command } from '@commander-js/extra-typings';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { ApplicationCommandType } from 'discord-api-types/v10';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommandsCommand } from '#commands/commands/CommandsCommand';
import { LARGE_BOT_THRESHOLD } from '#commands/commands/executeClean';
import { FAKE_TOKEN } from '#tests/commands/build/smoke';

import type { Flagged } from '#commands/commands/classify';
import type { CleanOps, CleanRunner, GuildSummary } from '#commands/commands/CleanRunner';
import type { Mock } from 'vitest';

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

interface CapturedOutput extends Disposable {
    stdout(): string;
    stderr(): string;
}

function captureOutput(): CapturedOutput {
    const capture = (stream: NodeJS.WriteStream): { text: () => string; restore: () => void } => {
        const chunks: string[] = [];
        const spy = vi.spyOn(stream, 'write').mockImplementation((chunk: string | Uint8Array) => {
            chunks.push(String(chunk));
            return true;
        });
        return { text: () => stripVTControlCharacters(chunks.join('')), restore: () => spy.mockRestore() };
    };
    const stdout = capture(process.stdout);
    const stderr = capture(process.stderr);

    return {
        stdout: stdout.text,
        stderr: stderr.text,
        [Symbol.dispose]: () => {
            stdout.restore();
            stderr.restore();
            process.exitCode = undefined;
        }
    };
}

async function run(runner: Record<keyof CleanOps, Mock>, ...args: string[]): Promise<void> {
    const program = new Command().exitOverride();
    // justified: flag mode calls only the CleanOps methods
    new CommandsCommand(runner as unknown as CleanRunner).register(program);
    await program.parseAsync(['commands', ...args], { from: 'user' });
}

describe('seedcord commands clean, on a terminal', () => {
    const original = { stdin: process.stdin.isTTY, stdout: process.stdout.isTTY, ci: process.env.CI };

    beforeEach(() => {
        process.stdin.isTTY = true;
        process.stdout.isTTY = true;
        delete process.env.CI;
        Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: FAKE_TOKEN }));
    });

    afterEach(() => {
        process.stdin.isTTY = original.stdin;
        process.stdout.isTTY = original.stdout;
        if (original.ci !== undefined) process.env.CI = original.ci;
    });

    // the wizard would wait on a keypress and time the test out
    it.each([['--guild', '1'], ['--all-guilds'], ['--apply'], ['--purge']])(
        'runs straight through with %s and opens no wizard',
        async (...flags) => {
            using _output = captureOutput();
            const runner = fakeRunner();

            await run(runner, 'clean', ...flags);

            expect(runner.resolveTargets).toHaveBeenCalledOnce();
        }
    );
});

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

    it('prints a row per step, then the duplicates and how to delete them', async () => {
        using output = captureOutput();

        await run(fakeRunner(), 'clean', '--guild', '1');

        const check = stripVTControlCharacters(paint.check);
        expect(output.stdout()).toMatch(new RegExp(String.raw`${check} connect +\S+\n`, 'u'));
        expect(output.stdout()).toMatch(new RegExp(String.raw`${check} scan +\S+ +1 duplicate in 1 guild\n`, 'u'));
        expect(output.stdout()).toContain('    one  /ban\n');
        expect(output.stdout()).toContain('--apply');
    });

    it('prints a failure as its code and message, with no stack', async () => {
        using output = captureOutput();
        const runner = fakeRunner();
        runner.resolveTargets.mockRejectedValue(new SeedcordError(SeedcordErrorCode.CliCleanNoGuilds));

        await run(runner, 'clean', '--apply');

        expect(output.stderr()).toContain(`[${SeedcordErrorCode.CliCleanNoGuilds}] No guilds given.`);
        expect(output.stderr()).not.toMatch(/^\s+at /mu);
        expect(process.exitCode).toBe(1);
    });
});
