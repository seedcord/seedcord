import path from 'node:path';

import { MemoryDriver } from '@seedcord/core';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tasks } from '#src/Tasks';
import { Abortable } from '#tests/fixtures/jobs/Abortable';
import { Boom } from '#tests/fixtures/jobs/Boom';
import { Note } from '#tests/fixtures/jobs/Note';
import { Reminder } from '#tests/fixtures/jobs/Reminder';
import { FakeDriver, TestHost } from '#tests/utils/host';

import type { MockInstance } from 'vitest';

const taskFolder = path.resolve(import.meta.dirname, 'fixtures/jobs');
const partialFolder = path.resolve(import.meta.dirname, 'fixtures/partial');

const SECOND_MS = 1000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const RETRY_MS = 30_000;

type Driver = ConstructorParameters<typeof TestHost>[0];

interface Booted {
    host: TestHost;
    tasks: Tasks;
}

async function boot(driver: Driver, folder = taskFolder): Promise<Booted> {
    const host = new TestHost(driver);
    const bot = host.attach('tasks', Tasks, { path: folder });
    await bot.tasks.init();
    return { host, tasks: bot.tasks };
}

async function start(driver: Driver, folder = taskFolder): Promise<Booted> {
    const booted = await boot(driver, folder);
    await booted.tasks.ready();
    return booted;
}

let driver: FakeDriver;
let errorLog: MockInstance;
let warnLog: MockInstance;

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-15T12:00:00Z'));
    errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    warnLog = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    driver = new FakeDriver();
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('Tasks scheduled jobs', () => {
    it('runs a job at its time and deletes the record', async () => {
        const { host, tasks } = await start(driver);

        const job = await tasks.schedule(Reminder, { in: '1h' });

        expect(job.key).toBe('reminder');
        expect(tasks.jobs()).toEqual([job]);

        await vi.advanceTimersByTimeAsync(HOUR_MS - 1);
        expect(host.runs).toEqual([]);

        await vi.advanceTimersByTimeAsync(1);
        expect(host.runs).toEqual([{ task: 'reminder', trigger: 'scheduled', data: undefined }]);
        expect(tasks.jobs()).toEqual([]);
        expect(driver.stored.size).toBe(0);
    });

    it('stores the job before schedule resolves', async () => {
        const { tasks } = await start(driver);

        await tasks.schedule(Reminder, { in: '1h' });

        expect(driver.stored.size).toBe(1);
    });

    it('runs a pending job after a restart', async () => {
        const first = await start(driver);
        const job = await first.tasks.schedule(Note, {
            in: '1h',
            data: { text: 'hi', sentAt: new Date('2030-01-01T00:00:00Z') }
        });
        await first.tasks.dispose();

        const second = await start(driver);

        expect(second.tasks.jobs()).toEqual([job]);

        await vi.advanceTimersByTimeAsync(HOUR_MS);

        expect(first.host.runs).toEqual([]);
        expect(second.host.runs).toEqual([
            { task: 'Note', trigger: 'scheduled', data: { text: 'hi', sentAt: '2030-01-01T00:00:00.000Z' } }
        ]);
    });

    it('hands a task the same data with and without a restart', async () => {
        const { host, tasks } = await start(driver);

        await tasks.schedule(Note, { in: '1s', data: { text: 'hi', sentAt: new Date('2030-01-01T00:00:00Z') } });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(host.runs[0]?.data).toEqual({ text: 'hi', sentAt: '2030-01-01T00:00:00.000Z' });
    });

    it('holds a job that came due during downtime until ready', async () => {
        const first = await start(driver);
        await first.tasks.schedule(Reminder, { in: '1h' });
        await first.tasks.dispose();

        vi.setSystemTime(Date.now() + DAY_MS);

        const second = await boot(driver);
        await vi.advanceTimersByTimeAsync(HOUR_MS);
        expect(second.host.runs).toEqual([]);

        await second.tasks.ready();
        await vi.advanceTimersByTimeAsync(0);
        expect(second.host.runs).toHaveLength(1);
    });

    it('holds a job scheduled before ready until ready', async () => {
        const { host, tasks } = await boot(driver);

        await tasks.schedule(Reminder, { at: new Date('2029-01-01T00:00:00Z') });
        await vi.advanceTimersByTimeAsync(HOUR_MS);
        expect(host.runs).toEqual([]);

        await tasks.ready();
        await vi.advanceTimersByTimeAsync(0);
        expect(host.runs).toHaveLength(1);
    });

    it('keeps a job scheduled during shutdown for the next start', async () => {
        const first = await start(driver);
        await first.tasks.dispose();

        await first.tasks.schedule(Reminder, { in: '1s' });
        await vi.advanceTimersByTimeAsync(HOUR_MS);
        expect(first.host.runs).toEqual([]);

        const second = await start(driver);
        await vi.advanceTimersByTimeAsync(0);
        expect(second.host.runs).toHaveLength(1);
    });

    it('waits past the setTimeout limit', async () => {
        const { host, tasks } = await start(driver);
        const days = 40;

        await tasks.schedule(Reminder, { in: `${days}d` });

        await vi.advanceTimersByTimeAsync((days - 1) * DAY_MS);
        expect(host.runs).toEqual([]);

        await vi.advanceTimersByTimeAsync(DAY_MS);
        expect(host.runs).toHaveLength(1);
    });

    it('takes at as a date or as epoch milliseconds', async () => {
        const { host, tasks } = await start(driver);

        await tasks.schedule(Reminder, { at: new Date(Date.now() + SECOND_MS) });
        await tasks.schedule(Reminder, { at: Date.now() + SECOND_MS });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(host.runs).toHaveLength(2);
    });

    it('does not run a job again after it throws', async () => {
        const { host, tasks } = await start(driver);
        const failed = vi.fn();
        host.bus.on('taskFailed', failed);

        const job = await tasks.schedule(Boom, { in: '1s' });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(failed).toHaveBeenCalledWith(
            expect.objectContaining({ key: 'Boom', trigger: 'scheduled', jobId: job.id })
        );
        expect(host.runs.map((run) => run.task)).toEqual(['Boom', 'onError']);
        expect(driver.stored.size).toBe(0);
    });

    it('publishes taskFinished with the job id', async () => {
        const { host, tasks } = await start(driver);
        const finished = vi.fn();
        host.bus.on('taskFinished', finished);

        const job = await tasks.schedule(Reminder, { in: '1s' });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(finished).toHaveBeenCalledWith(
            expect.objectContaining({ key: 'reminder', trigger: 'scheduled', jobId: job.id })
        );
    });

    it('runs a job again when shutdown interrupts it', async () => {
        const first = await start(driver);
        await first.tasks.schedule(Abortable, { in: '1s' });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        await first.tasks.dispose();
        expect(driver.stored.size).toBe(1);

        const second = await start(driver);
        await vi.advanceTimersByTimeAsync(0);

        expect(first.host.runs).toHaveLength(1);
        expect(second.host.runs).toHaveLength(1);
        await second.tasks.dispose();
    });

    it('runs a job again when the process died during it', async () => {
        const first = await start(driver);
        first.host.hold();
        await first.tasks.schedule(Note, { in: '1s', data: { text: 'hi', sentAt: new Date() } });
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(first.host.runs).toHaveLength(1);

        // no dispose. a killed process never reaches it
        const second = await start(driver);
        await vi.advanceTimersByTimeAsync(0);

        expect(second.host.runs).toHaveLength(1);
    });

    it('waits for a run that dispose interrupted before it resolves', async () => {
        const { host, tasks } = await start(driver);
        host.hold();
        await tasks.schedule(Note, { in: '1s', data: { text: 'hi', sentAt: new Date() } });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        let disposed = false;
        const disposing = tasks.dispose().then(() => {
            disposed = true;
        });
        await vi.advanceTimersByTimeAsync(HOUR_MS);
        expect(disposed).toBe(false);

        host.release();
        await disposing;
        expect(driver.stored.size).toBe(0);
    });
});

describe('Tasks.cancel', () => {
    it('cancels a pending job', async () => {
        const { host, tasks } = await start(driver);
        const job = await tasks.schedule(Reminder, { in: '1s' });

        await expect(tasks.cancel(job.id)).resolves.toBe(true);
        await vi.advanceTimersByTimeAsync(HOUR_MS);

        expect(host.runs).toEqual([]);
        expect(tasks.jobs()).toEqual([]);
        expect(driver.stored.size).toBe(0);
    });

    it('cancels a stored job this process holds no timer for', async () => {
        const first = await start(driver);
        const job = await first.tasks.schedule(Reminder, { in: '1h' });
        const second = await start(driver);

        await expect(second.tasks.cancel(job.id)).resolves.toBe(true);
        await vi.advanceTimersByTimeAsync(HOUR_MS);

        expect(first.host.runs).toEqual([]);
        expect(second.host.runs).toEqual([]);
    });

    it('reports an unknown id', async () => {
        const { tasks } = await start(driver);

        await expect(tasks.cancel('missing')).resolves.toBe(false);
    });

    it('refuses to cancel a job that has started', async () => {
        const { host, tasks } = await start(driver);
        host.hold();
        const job = await tasks.schedule(Note, { in: '1s', data: { text: 'hi', sentAt: new Date() } });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        await expect(tasks.cancel(job.id)).resolves.toBe(false);
        host.release();
    });
});

describe('Tasks job upkeep', () => {
    it('keeps a job whose task is missing until a start that has the task', async () => {
        const first = await start(driver);
        await first.tasks.schedule(Reminder, { in: '1s' });
        await first.tasks.dispose();

        const without = await start(driver, partialFolder);
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(without.host.runs).toEqual([]);
        expect(driver.stored.size).toBe(1);
        await without.tasks.dispose();

        const withTask = await start(driver);
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(withTask.host.runs).toHaveLength(1);
        expect(driver.stored.size).toBe(0);
    });

    it('tries a job again when the store fails its read', async () => {
        const { host, tasks } = await start(driver);
        const job = await tasks.schedule(Reminder, { in: '1s' });

        driver.failReads = 1;
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(host.runs).toEqual([]);
        expect(tasks.jobs()).toEqual([job]);

        await vi.advanceTimersByTimeAsync(RETRY_MS);
        expect(host.runs).toHaveLength(1);
    });

    it('logs a failed delete and keeps the job for the next start', async () => {
        const { host, tasks } = await start(driver);
        await tasks.schedule(Reminder, { in: '1s' });

        driver.failDeletes = 1;
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(host.runs).toHaveLength(1);
        expect(driver.stored.size).toBe(1);
        expect(errorLog).toHaveBeenCalledOnce();
    });

    it('keeps two attachments in separate records', async () => {
        const host = new TestHost(driver);
        const bot = host.attach('one', Tasks, { path: taskFolder }).attach('two', Tasks, { path: taskFolder });
        await bot.one.init();
        await bot.two.init();

        const job = await bot.one.schedule(Reminder, { in: '1h' });

        await expect(bot.two.cancel(job.id)).resolves.toBe(false);
    });

    it('warns at shutdown when the jobs live in a MemoryDriver', async () => {
        const { tasks } = await start(new MemoryDriver());
        await tasks.schedule(Reminder, { in: '1h' });

        await tasks.dispose();

        expect(warnLog).toHaveBeenCalledOnce();
    });

    it('stays quiet at shutdown on a driver that keeps its records', async () => {
        const { tasks } = await start(driver);
        await tasks.schedule(Reminder, { in: '1h' });

        await tasks.dispose();

        expect(warnLog).not.toHaveBeenCalled();
    });

    describe('rejects', () => {
        it('a duration parseDuration cannot read', async () => {
            const { tasks } = await start(driver);
            const duration = String('soon');

            await expect(tasks.schedule(Reminder, { in: duration })).rejects.toMatchObject({
                code: SeedcordErrorCode.PluginTasksInvalidDuration
            });
        });

        it('an at in seconds', async () => {
            const { tasks } = await start(driver);
            const seconds = Math.floor(Date.now() / SECOND_MS);

            await expect(tasks.schedule(Reminder, { at: seconds })).rejects.toMatchObject({
                code: SeedcordErrorCode.PluginTasksAtInSeconds
            });
        });

        it('an invalid date', async () => {
            const { tasks } = await start(driver);

            await expect(tasks.schedule(Reminder, { at: new Date('nope') })).rejects.toMatchObject({
                code: SeedcordErrorCode.PluginTasksInvalidDate
            });
        });

        it('data with a cycle, and stores nothing', async () => {
            const { tasks } = await start(driver);
            const data = { text: 'hi', sentAt: new Date() };
            Object.assign(data, { self: data });

            await expect(tasks.schedule(Note, { in: '1s', data })).rejects.toMatchObject({
                code: SeedcordErrorCode.PluginTasksDataNotJson
            });
            expect(driver.stored.size).toBe(0);
        });

        it('a task the plugin did not load', async () => {
            const { tasks } = await start(driver, partialFolder);

            await expect(tasks.schedule(Reminder, { in: '1s' })).rejects.toMatchObject({
                code: SeedcordErrorCode.PluginTasksNotLoaded
            });
        });
    });
});
