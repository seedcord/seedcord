import { describe, expect, it, vi, type Mock } from 'vitest';

import { emptyOutcome, executeClean, LARGE_BOT_THRESHOLD } from '@commands/commands/executeClean';

import type { Flagged } from '@commands/commands/classify';
import type { CleanOps, CleanScope, GuildSummary, ScanResult } from '@commands/commands/CleanRunner';
import type { CleanPresenter } from '@commands/commands/executeClean';

const flagged: Flagged[] = [{ guildId: 'g1', guildName: 'Alpha', id: '1', name: 'ban', reason: 'overlap' }];
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

function fakePresenter(over: Partial<Record<keyof CleanPresenter, Mock>> = {}): Record<keyof CleanPresenter, Mock> {
    return {
        status: vi.fn((_message: string, task: () => Promise<unknown>) => task()),
        preview: vi.fn(),
        largeBotGuard: vi.fn(() => Promise.resolve(true)),
        confirmDelete: vi.fn(() => Promise.resolve(true)),
        result: vi.fn(),
        nothingToClean: vi.fn(),
        dryRunHint: vi.fn(),
        ...over
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
    function run(
        runner: Record<keyof CleanOps, Mock>,
        presenter: CleanPresenter,
        apply: boolean,
        over: Partial<CleanScope> = {}
    ): Promise<void> {
        return executeClean({ runner, scope: { ...scope, ...over }, apply, token: 'token', presenter });
    }

    it('reports nothing to clean and never previews, confirms, or deletes when the scan is empty', async () => {
        const runner = fakeRunner({ scan: emptyScan });
        const presenter = fakePresenter();

        await run(runner, presenter, true);

        expect(presenter.nothingToClean).toHaveBeenCalledOnce();
        expect(presenter.preview).not.toHaveBeenCalled();
        expect(presenter.confirmDelete).not.toHaveBeenCalled();
        expect(runner.applyDeletions).not.toHaveBeenCalled();
    });

    it('previews and shows the dry-run hint without confirming or deleting when apply is false', async () => {
        const runner = fakeRunner();
        const presenter = fakePresenter();

        await run(runner, presenter, false);

        expect(presenter.preview).toHaveBeenCalledOnce();
        expect(presenter.dryRunHint).toHaveBeenCalledOnce();
        expect(presenter.confirmDelete).not.toHaveBeenCalled();
        expect(runner.applyDeletions).not.toHaveBeenCalled();
    });

    it('deletes and renders the result when apply is true and the delete is confirmed', async () => {
        const runner = fakeRunner();
        const presenter = fakePresenter();

        await run(runner, presenter, true);

        expect(presenter.confirmDelete).toHaveBeenCalledWith(1, 0);
        expect(runner.applyDeletions).toHaveBeenCalledWith('token', 'app1', flagged);
        expect(presenter.result).toHaveBeenCalledOnce();
    });

    it('does not delete when the confirm is declined', async () => {
        const runner = fakeRunner();
        const presenter = fakePresenter({ confirmDelete: vi.fn(() => Promise.resolve(false)) });

        await run(runner, presenter, true);

        expect(runner.applyDeletions).not.toHaveBeenCalled();
        expect(presenter.result).not.toHaveBeenCalled();
    });

    it('runs the large-bot guard above the threshold and aborts before scanning when declined', async () => {
        const guilds = Array.from({ length: LARGE_BOT_THRESHOLD + 1 }, (_, i) => ({ id: String(i), name: String(i) }));
        const runner = fakeRunner({ guilds });
        const presenter = fakePresenter({ largeBotGuard: vi.fn(() => Promise.resolve(false)) });

        await run(runner, presenter, true, { guildIds: [], allGuilds: true });

        expect(presenter.largeBotGuard).toHaveBeenCalledWith(guilds.length);
        expect(runner.scanGuilds).not.toHaveBeenCalled();
    });

    it('skips the large-bot guard at or below the threshold', async () => {
        const guilds = Array.from({ length: LARGE_BOT_THRESHOLD }, (_, i) => ({ id: String(i), name: String(i) }));
        const runner = fakeRunner({ guilds });
        const presenter = fakePresenter();

        await run(runner, presenter, false, { guildIds: [], allGuilds: true });

        expect(presenter.largeBotGuard).not.toHaveBeenCalled();
        expect(runner.scanGuilds).toHaveBeenCalledOnce();
    });
});
