import path from 'node:path';

import { Envapter, Environment } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { Later } from '#tests/fixtures/dev/Later';
import { LaterLoud } from '#tests/fixtures/dev/LaterLoud';
import { Quiet } from '#tests/fixtures/dev/Quiet';
import { captureLogs, start } from '#tests/utils/host';

import type { TasksOptions } from '#src/types/Tasks';
import type { TestHost } from '#tests/utils/host';

const SECOND_MS = 1000;

const dev: TasksOptions = { path: path.resolve(import.meta.dirname, 'fixtures/dev') };

const ranTasks = (host: TestHost): string[] => [...new Set(host.runs.map((run) => run.task))].toSorted();

describe('Tasks in development', () => {
    let environment: string;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2030-01-15T12:00:00Z'));
        environment = Envapter.environment;
        Envapter.environment = Environment.Development;
    });

    afterEach(() => {
        Envapter.environment = environment;
        vi.useRealTimers();
    });

    it('runs only the cron jobs that set runInDev', async () => {
        await using booted = await start(dev);
        const { host, tasks } = booted;

        await vi.advanceTimersByTimeAsync(SECOND_MS * 2);

        expect(ranTasks(host)).toEqual(['Loud']);
        expect(tasks.nextRun(Quiet)).toBeNull();
        expect(tasks.crons().find((status) => status.key === 'Quiet')?.active).toBe(false);
    });

    it('runs every cron job without runInDev: false once the plugin sets runInDev', async () => {
        await using booted = await start({ ...dev, runInDev: true });
        const { host } = booted;

        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(ranTasks(host)).toEqual(['Loud', 'Quiet']);
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

    it('stores a scheduled task without runInDev and leaves it waiting', async () => {
        await using booted = await start(dev);
        const { host, tasks } = booted;

        const held = await tasks.schedule(Later, { in: '1s' });
        await tasks.schedule(LaterLoud, { in: '1s' });
        await vi.advanceTimersByTimeAsync(SECOND_MS * 2);

        expect(host.runs.filter((run) => run.trigger === 'scheduled')).toEqual([
            { task: 'LaterLoud', trigger: 'scheduled', data: undefined }
        ]);
        expect(tasks.jobs()).toEqual([held]);
    });

    it('says which tasks wait for runInDev', async () => {
        using logs = captureLogs();
        await using _booted = await start(dev);

        expect(logs.at('info')).toContainEqual(expect.stringContaining('runInDev'));
    });

    it('runs every task outside development', async () => {
        Envapter.environment = Environment.Production;
        await using booted = await start(dev);
        const { host, tasks } = booted;

        await tasks.schedule(Later, { in: '1s' });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(ranTasks(host)).toEqual(['Later', 'Loud', 'Muted', 'Quiet']);
    });
});
