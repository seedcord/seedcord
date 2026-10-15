import { stripVTControlCharacters } from 'node:util';

import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it, vi, type Mock } from 'vitest';

import { CleanPresenter } from '#commands/commands/clean/CleanPresenter';
import { emptyOutcome, executeClean, LARGE_BOT_THRESHOLD } from '#commands/commands/clean/executeClean';

import type { Flagged } from '#commands/commands/clean/classify';
import type { CleanOps, CleanScope, ScanResult } from '#commands/commands/clean/CleanRunner';
import type { GuildSummary } from '#core/discord/readBotGuilds';

const flagged: Flagged[] = [
    {
        guildId: 'g1',
        guildName: 'Alpha',
        id: '1',
        name: 'ban',
        type: ApplicationCommandType.ChatInput,
        reason: 'overlap'
    }
];
const scope: CleanScope = { guildIds: ['g1'], allGuilds: false, purge: false };

const fullScan: ScanResult = {
    flagged,
    skipped: [],
    scannedGuildCount: 1,
    scannedCommandCount: 1,
    globalCommandCount: 1
};
const emptyScan: ScanResult = { ...fullScan, flagged: [] };

function fakeRunner(over: { guilds?: GuildSummary[]; scan?: ScanResult } = {}): Record<keyof CleanOps, Mock> {
    return {
        resolveTargets: vi.fn(() =>
            Promise.resolve({ appId: 'app1', guilds: over.guilds ?? [{ id: 'g1', name: 'Alpha' }] })
        ),
        scanGuilds: vi.fn(() => Promise.resolve(over.scan ?? fullScan)),
        applyDeletions: vi.fn(() => Promise.resolve({ deleted: flagged.length, failed: [] }))
    };
}

describe('emptyOutcome', () => {
    const base: ScanResult = {
        flagged: [],
        skipped: [],
        scannedGuildCount: 0,
        scannedCommandCount: 0,
        globalCommandCount: 0
    };

    it('is all-skipped when nothing scanned but a guild failed', () => {
        expect(emptyOutcome({ ...base, skipped: [{ guildId: 'g', guildName: 'G', reason: 'x' }] }, false)).toBe(
            'all-skipped'
        );
    });

    it('is no-commands when the scanned guilds had no commands', () => {
        expect(emptyOutcome({ ...base, scannedGuildCount: 2 }, false)).toBe('no-commands');
    });

    it('is no-globals when overlap mode and the app has no global commands', () => {
        expect(
            emptyOutcome({ ...base, scannedGuildCount: 1, scannedCommandCount: 3, globalCommandCount: 0 }, false)
        ).toBe('no-globals');
    });

    it('is no-overlaps when commands and globals exist but none match', () => {
        expect(
            emptyOutcome({ ...base, scannedGuildCount: 1, scannedCommandCount: 3, globalCommandCount: 5 }, false)
        ).toBe('no-overlaps');
    });
});

describe('executeClean', () => {
    interface Run {
        lines: string[];
        confirm: Mock<(message: string) => Promise<boolean>>;
    }

    async function run(
        runner: Record<keyof CleanOps, Mock>,
        { apply, answer = true, over = {} }: { apply: boolean; answer?: boolean; over?: Partial<CleanScope> }
    ): Promise<Run> {
        const lines: string[] = [];
        const confirm = vi.fn(() => Promise.resolve(answer));
        const output = {
            step: <Result>(_label: string, task: () => Promise<Result>) => task(),
            line: (text = '') => lines.push(stripVTControlCharacters(text)),
            wrapped: (text: string) => lines.push(stripVTControlCharacters(text)),
            warn: (text: string) => lines.push(text)
        };
        await executeClean({
            runner,
            scope: { ...scope, ...over },
            apply,
            token: 'token',
            presenter: new CleanPresenter(output, confirm)
        });
        return { lines, confirm };
    }

    it('reports nothing to clean and never asks or deletes when the scan is empty', async () => {
        const runner = fakeRunner({ scan: emptyScan });

        const { lines, confirm } = await run(runner, { apply: true });

        expect(lines).toContain('Nothing to clean.');
        expect(confirm).not.toHaveBeenCalled();
        expect(runner.applyDeletions).not.toHaveBeenCalled();
    });

    it('lists the duplicates and says how to delete them on a dry run', async () => {
        const runner = fakeRunner();

        const { lines, confirm } = await run(runner, { apply: false });

        expect(lines).toContain('/ban');
        expect(lines).toContain('Dry run. Re-run with --apply to delete these.');
        expect(confirm).not.toHaveBeenCalled();
        expect(runner.applyDeletions).not.toHaveBeenCalled();
    });

    it('asks before it deletes, then deletes what the scan flagged', async () => {
        const runner = fakeRunner();

        const { confirm } = await run(runner, { apply: true });

        expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Delete 1 guild command?'));
        expect(runner.applyDeletions).toHaveBeenCalledWith('token', 'app1', flagged);
    });

    it('deletes nothing when the delete is declined', async () => {
        const runner = fakeRunner();

        const { lines } = await run(runner, { apply: true, answer: false });

        expect(runner.applyDeletions).not.toHaveBeenCalled();
        expect(lines).not.toContain('Global commands untouched.');
    });

    it('asks before scanning more guilds than one page holds, and stops when declined', async () => {
        const guilds = Array.from({ length: LARGE_BOT_THRESHOLD + 1 }, (_, i) => ({ id: String(i), name: String(i) }));
        const runner = fakeRunner({ guilds });

        const { confirm } = await run(runner, { apply: true, answer: false, over: { guildIds: [], allGuilds: true } });

        expect(confirm).toHaveBeenCalledWith(expect.stringContaining(`${guilds.length} guilds`));
        expect(runner.scanGuilds).not.toHaveBeenCalled();
    });

    it('scans without asking at or below one page of guilds', async () => {
        const guilds = Array.from({ length: LARGE_BOT_THRESHOLD }, (_, i) => ({ id: String(i), name: String(i) }));
        const runner = fakeRunner({ guilds });

        const { confirm } = await run(runner, { apply: false, over: { guildIds: [], allGuilds: true } });

        expect(confirm).not.toHaveBeenCalled();
        expect(runner.scanGuilds).toHaveBeenCalledOnce();
    });
});
