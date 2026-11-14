import path from 'node:path';

import { setDevChannel } from '@seedcord/core/internal';
import { Envapter, Environment } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { Later } from '#tests/fixtures/dev/Later';
import { Quiet } from '#tests/fixtures/dev/Quiet';
import { FakeDriver, captureLogs, start } from '#tests/utils/host';

import type { TasksOptions } from '#src/types/Tasks';
import type { TestHost } from '#tests/utils/host';

const SECOND_MS = 1000;

const dev: TasksOptions = { path: path.resolve(import.meta.dirname, 'fixtures/dev') };

const ranTasks = (host: TestHost): string[] => [...new Set(host.runs.map((run) => run.task))].toSorted();

// seedcord dev sets this channel, and nothing else does
const startDevChannel = (): void => {
    setDevChannel({ send: () => undefined, on: () => undefined, off: () => undefined });
};

describe('Tasks under seedcord dev', () => {
    const environment = Envapter.environment;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2030-01-15T12:00:00Z'));
        startDevChannel();
    });

    afterEach(() => {
        setDevChannel(undefined);
        Envapter.environment = environment;
        vi.useRealTimers();
    });

    it('holds cron jobs and stores scheduled jobs without running them', async () => {
        await using booted = await start(dev);
        const { host, tasks } = booted;

        const job = await tasks.schedule(Later, { in: '1s' });
        await vi.advanceTimersByTimeAsync(SECOND_MS * 2);

        expect(host.runs).toEqual([]);
        expect(tasks.nextRun(Quiet)).toBeNull();
        expect(tasks.crons().find((status) => status.key === 'Quiet')?.active).toBe(false);
        expect(tasks.jobs()).toEqual([job]);
    });

    it('runs every task once the plugin sets runInDev', async () => {
        await using booted = await start({ ...dev, runInDev: true });
        const { host, tasks } = booted;

        await tasks.schedule(Later, { in: '1s' });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(ranTasks(host)).toEqual(['Later', 'Quiet']);
    });

    it('runs a held cron job through trigger() and resume()', async () => {
        await using booted = await start(dev);
        const { host, tasks } = booted;

        await tasks.trigger(Quiet);
        expect(host.runs).toContainEqual({ task: 'Quiet', trigger: 'manual', data: undefined });

        tasks.resume(Quiet);
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(host.runs).toContainEqual({ task: 'Quiet', trigger: 'cron', data: undefined });
    });

    it('counts the cron jobs and stored jobs it holds', async () => {
        using driver = new FakeDriver();
        {
            await using booted = await start(dev, driver);
            await booted.tasks.schedule(Later, { in: '1h' });
        }
        using logs = captureLogs();
        await using _booted = await start(dev, driver);

        expect(logs.at('info')).toContainEqual(expect.stringContaining('holds 1 cron job and 1 scheduled job'));
    });

    it('runs every task outside seedcord dev, even in development mode', async () => {
        setDevChannel(undefined);
        Envapter.environment = Environment.Development;
        await using booted = await start(dev);
        const { host, tasks } = booted;

        await tasks.schedule(Later, { in: '1s' });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(ranTasks(host)).toEqual(['Later', 'Quiet']);
    });
});
