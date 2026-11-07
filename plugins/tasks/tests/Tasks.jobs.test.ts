import path from 'node:path';

import { MemoryDriver } from '@seedcord/core';
import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tasks } from '#src/Tasks';
import { Abortable } from '#tests/fixtures/jobs/Abortable';
import { Boom } from '#tests/fixtures/jobs/Boom';
import { Broken } from '#tests/fixtures/jobs/Broken';
import { Note } from '#tests/fixtures/jobs/Note';
import { Reminder } from '#tests/fixtures/jobs/Reminder';
import { Reminder as TwinReminder } from '#tests/fixtures/twin/Reminder';
import { FakeDriver, TestHost, boot, captureLogs, start } from '#tests/utils/host';

import type { TasksOptions } from '#src/types/Tasks';

const jobs: TasksOptions = { path: path.resolve(import.meta.dirname, 'fixtures/jobs') };
const partial: TasksOptions = { path: path.resolve(import.meta.dirname, 'fixtures/partial') };

const SECOND_MS = 1000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const RETRY_MS = 30_000;

let driver: FakeDriver;

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-15T12:00:00Z'));
    driver = new FakeDriver();
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('Tasks scheduled jobs', () => {
    it('runs a job at its time and deletes the record', async () => {
        await using booted = await start(jobs, driver);
        const { host, tasks } = booted;

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

    it('keeps its time when a caller changes a returned date', async () => {
        await using booted = await start(jobs, driver);
        const { host, tasks } = booted;

        const job = await tasks.schedule(Reminder, { in: '1h' });
        job.at.setTime(job.at.getTime() + DAY_MS);
        tasks.jobs()[0]?.at.setTime(job.at.getTime() + DAY_MS);

        await vi.advanceTimersByTimeAsync(HOUR_MS);
        expect(host.runs).toHaveLength(1);
    });

    it('resolves schedule only once the driver holds the job', async () => {
        await using booted = await start(jobs, driver);
        const { tasks } = booted;
        const release = driver.holdSets();

        let resolved = false;
        const scheduling = tasks.schedule(Reminder, { in: '1h' }).then(() => {
            resolved = true;
        });
        await vi.advanceTimersByTimeAsync(0);
        expect(resolved).toBe(false);
        expect(driver.stored.size).toBe(0);

        release();
        await scheduling;
        expect(driver.stored.size).toBe(1);
    });

    it('runs a pending job after a restart, with the data the same process would get', async () => {
        const data = { text: 'hi', sentAt: new Date('2030-01-01T00:00:00Z') };
        const stored = { text: 'hi', sentAt: '2030-01-01T00:00:00.000Z' };

        await using first = await start(jobs, driver);
        const job = await first.tasks.schedule(Note, { in: '1h', data });
        await first.tasks.schedule(Note, { in: '1s', data });
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        await first.tasks.dispose();

        await using second = await start(jobs, driver);
        expect(second.tasks.jobs()).toEqual([job]);
        await vi.advanceTimersByTimeAsync(HOUR_MS);

        expect(first.host.runs).toEqual([{ task: 'Note', trigger: 'scheduled', data: stored }]);
        expect(second.host.runs).toEqual([{ task: 'Note', trigger: 'scheduled', data: stored }]);
    });

    it('holds a job that came due during downtime until ready', async () => {
        await using first = await start(jobs, driver);
        await first.tasks.schedule(Reminder, { in: '1h' });
        await first.tasks.dispose();

        vi.setSystemTime(Date.now() + DAY_MS);

        await using second = await boot(jobs, driver);
        await vi.advanceTimersByTimeAsync(HOUR_MS);
        expect(second.host.runs).toEqual([]);

        second.tasks.ready();
        await vi.advanceTimersByTimeAsync(0);
        expect(second.host.runs).toHaveLength(1);
    });

    it('holds a job scheduled before ready until ready', async () => {
        await using booted = await boot(jobs, driver);
        const { host, tasks } = booted;

        await tasks.schedule(Reminder, { at: new Date('2029-01-01T00:00:00Z') });
        await vi.advanceTimersByTimeAsync(HOUR_MS);
        expect(host.runs).toEqual([]);

        tasks.ready();
        await vi.advanceTimersByTimeAsync(0);
        expect(host.runs).toHaveLength(1);
    });

    it('keeps a job scheduled during shutdown for the next start', async () => {
        await using first = await start(jobs, driver);
        await first.tasks.dispose();

        await first.tasks.schedule(Reminder, { in: '1s' });
        await vi.advanceTimersByTimeAsync(HOUR_MS);
        expect(first.host.runs).toEqual([]);

        await using second = await start(jobs, driver);
        await vi.advanceTimersByTimeAsync(0);
        expect(second.host.runs).toHaveLength(1);
    });

    it('waits past the setTimeout limit', async () => {
        await using booted = await start(jobs, driver);
        const { host, tasks } = booted;
        const days = 40;

        await tasks.schedule(Reminder, { in: `${days}d` });

        await vi.advanceTimersByTimeAsync((days - 1) * DAY_MS);
        expect(host.runs).toEqual([]);

        await vi.advanceTimersByTimeAsync(DAY_MS);
        expect(host.runs).toHaveLength(1);
    });

    it('takes at as a date or as epoch milliseconds', async () => {
        await using booted = await start(jobs, driver);
        const { host, tasks } = booted;

        await tasks.schedule(Reminder, { at: new Date(Date.now() + SECOND_MS) });
        await tasks.schedule(Reminder, { at: Date.now() + SECOND_MS });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(host.runs).toHaveLength(2);
    });

    it('does not run a job again after it throws, and carries on when onError throws too', async () => {
        using logs = captureLogs();
        await using booted = await start(jobs, driver);
        const { host, tasks } = booted;
        const ran = vi.fn();
        host.bus.on('taskRan', ran);

        const job = await tasks.schedule(Boom, { in: '1s' });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(ran).toHaveBeenCalledWith(
            expect.objectContaining({ key: 'Boom', trigger: 'scheduled', jobId: job.id, outcome: 'failed' })
        );
        expect(host.runs.map((run) => run.task)).toEqual(['Boom', 'onError']);
        expect(logs.at('error')).toEqual([expect.stringContaining('Boom'), expect.stringContaining('onError')]);
        expect(driver.stored.size).toBe(0);

        await tasks.schedule(Reminder, { in: '1s' });
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(host.runs.map((run) => run.task)).toEqual(['Boom', 'onError', 'reminder']);
    });

    it('publishes a failed run and deletes the job when the constructor throws', async () => {
        using logs = captureLogs();
        await using booted = await start(jobs, driver);
        const { host, tasks } = booted;
        const ran = vi.fn();
        host.bus.on('taskRan', ran);

        await tasks.schedule(Broken, { in: '1s' });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(ran).toHaveBeenCalledWith(
            expect.objectContaining({ key: 'Broken', outcome: 'failed', error: new Error('no') })
        );
        expect(logs.at('error')).toEqual([expect.stringContaining('Broken')]);
        expect(driver.stored.size).toBe(0);
    });

    it('publishes a finished run with the job id', async () => {
        await using booted = await start(jobs, driver);
        const { host, tasks } = booted;
        const ran = vi.fn();
        host.bus.on('taskRan', ran);

        const job = await tasks.schedule(Reminder, { in: '1s' });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(ran).toHaveBeenCalledWith(
            expect.objectContaining({ key: 'reminder', trigger: 'scheduled', jobId: job.id, outcome: 'finished' })
        );
    });

    it('runs a job again when shutdown interrupts it', async () => {
        await using first = await start(jobs, driver);
        await first.tasks.schedule(Abortable, { in: '1s' });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        await first.tasks.dispose();
        expect(driver.stored.size).toBe(1);

        await using second = await start(jobs, driver);
        await vi.advanceTimersByTimeAsync(0);

        expect(first.host.runs).toHaveLength(1);
        expect(second.host.runs).toHaveLength(1);
    });

    it('reports a run that shutdown interrupts as interrupted, without calling onError', async () => {
        await using booted = await start(jobs, driver);
        const { host, tasks } = booted;
        const ran = vi.fn();
        host.bus.on('taskRan', ran);
        const onError = vi.spyOn(Abortable.prototype, 'onError');
        await tasks.schedule(Abortable, { in: '1s' });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        await tasks.dispose();

        expect(ran).toHaveBeenCalledWith(expect.objectContaining({ key: 'Abortable', outcome: 'interrupted' }));
        expect(onError).not.toHaveBeenCalled();
    });

    it('runs a job again when the process died during it', async () => {
        // no using. a killed process never disposes, and its held run would keep dispose waiting
        const first = await start(jobs, driver);
        first.host.hold();
        await first.tasks.schedule(Note, { in: '1s', data: { text: 'hi', sentAt: new Date() } });
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(first.host.runs).toHaveLength(1);

        await using second = await start(jobs, driver);
        await vi.advanceTimersByTimeAsync(0);

        expect(second.host.runs).toHaveLength(1);
    });

    it('waits for a run that dispose interrupted before it resolves', async () => {
        await using booted = await start(jobs, driver);
        const { host, tasks } = booted;
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
        await using booted = await start(jobs, driver);
        const { host, tasks } = booted;
        const job = await tasks.schedule(Reminder, { in: '1s' });

        await expect(tasks.cancel(job.id)).resolves.toBe(true);
        await vi.advanceTimersByTimeAsync(HOUR_MS);

        expect(host.runs).toEqual([]);
        expect(tasks.jobs()).toEqual([]);
        expect(driver.stored.size).toBe(0);
    });

    it('cancels a job that another process holds the timer for', async () => {
        await using first = await start(jobs, driver);
        const job = await first.tasks.schedule(Reminder, { in: '1h' });
        await using second = await start(jobs, driver);

        await expect(second.tasks.cancel(job.id)).resolves.toBe(true);
        await vi.advanceTimersByTimeAsync(HOUR_MS);

        expect(first.host.runs).toEqual([]);
        expect(second.host.runs).toEqual([]);
    });

    it('cancels a stored job this process holds no timer for', async () => {
        await using first = await start(jobs, driver);
        const job = await first.tasks.schedule(Reminder, { in: '1s' });
        await first.tasks.dispose();
        // partial doesn't load Reminder, so the due job stays in the store with no timer
        await using booted = await start(partial, driver);
        const { tasks } = booted;
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(tasks.jobs()).toEqual([]);

        await expect(tasks.cancel(job.id)).resolves.toBe(true);
        expect(driver.stored.size).toBe(0);
    });

    it('reports an unknown id', async () => {
        await using booted = await start(jobs, driver);
        const { tasks } = booted;

        await expect(tasks.cancel('missing')).resolves.toBe(false);
    });

    it('does not run a job that comes due while its cancel is deleting it', async () => {
        await using booted = await start(jobs, driver);
        const { host, tasks } = booted;
        const job = await tasks.schedule(Reminder, { in: '1s' });
        await vi.advanceTimersByTimeAsync(SECOND_MS - 1);

        const release = driver.holdDeletes();
        const cancelling = tasks.cancel(job.id);
        await vi.advanceTimersByTimeAsync(1);
        release();

        await expect(cancelling).resolves.toBe(true);
        expect(host.runs).toEqual([]);
        expect(driver.stored.size).toBe(0);
    });

    it('keeps a job whose cancel could not delete it', async () => {
        await using booted = await start(jobs, driver);
        const { host, tasks } = booted;
        const job = await tasks.schedule(Reminder, { in: '1s' });

        driver.failDeletes = 1;
        await expect(tasks.cancel(job.id)).rejects.toMatchObject({ code: SeedcordErrorCode.CoreKvDriverFailed });
        expect(tasks.jobs()).toEqual([job]);

        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(host.runs).toHaveLength(1);
    });

    it('refuses to cancel a job that has started', async () => {
        await using booted = await start(jobs, driver);
        const { host, tasks } = booted;
        host.hold();
        const job = await tasks.schedule(Note, { in: '1s', data: { text: 'hi', sentAt: new Date() } });
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        await expect(tasks.cancel(job.id)).resolves.toBe(false);
        host.release();
    });
});

describe('Tasks job upkeep', () => {
    it('keeps a job whose task is missing until a start that has the task', async () => {
        await using first = await start(jobs, driver);
        await first.tasks.schedule(Reminder, { in: '1s' });
        await first.tasks.dispose();

        await using without = await start(partial, driver);
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(without.host.runs).toEqual([]);
        expect(driver.stored.size).toBe(1);
        await without.tasks.dispose();

        await using withTask = await start(jobs, driver);
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(withTask.host.runs).toHaveLength(1);
        expect(driver.stored.size).toBe(0);
    });

    it('tries a job again when the store fails its read', async () => {
        await using booted = await start(jobs, driver);
        const { host, tasks } = booted;
        const job = await tasks.schedule(Reminder, { in: '1s' });

        driver.failReads = 1;
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(host.runs).toEqual([]);
        expect(tasks.jobs()).toEqual([job]);

        await vi.advanceTimersByTimeAsync(RETRY_MS);
        expect(host.runs).toHaveLength(1);
    });

    it('logs a failed delete and keeps the job for the next start', async () => {
        using logs = captureLogs();
        await using booted = await start(jobs, driver);
        const { host, tasks } = booted;
        const job = await tasks.schedule(Reminder, { in: '1s' });

        driver.failDeletes = 1;
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(host.runs).toHaveLength(1);
        expect(driver.stored.size).toBe(1);
        expect(logs.at('error')).toEqual([expect.stringContaining(job.id)]);
    });

    it('keeps two attachments in separate records', async () => {
        const host = new TestHost(driver);
        const bot = host.attach('one', Tasks, jobs).attach('two', Tasks, jobs);
        await using plugins = new AsyncDisposableStack();
        plugins.defer(() => bot.one.dispose());
        plugins.defer(() => bot.two.dispose());
        await bot.one.init();
        await bot.two.init();

        const job = await bot.one.schedule(Reminder, { in: '1h' });

        await expect(bot.two.cancel(job.id)).resolves.toBe(false);
    });

    it('warns once, on the first job scheduled into a MemoryDriver', async () => {
        using logs = captureLogs();
        await using booted = await start(jobs, new MemoryDriver());
        const { tasks } = booted;

        await tasks.schedule(Reminder, { in: '1h' });
        expect(logs.at('warn')).toEqual([expect.stringContaining('end when it exits')]);

        await tasks.schedule(Reminder, { in: '2h' });
        expect(logs.at('warn')).toHaveLength(1);
    });

    it('does not warn on a driver that keeps its records', async () => {
        using logs = captureLogs();
        await using booted = await start(jobs, driver);
        const { tasks } = booted;

        await tasks.schedule(Reminder, { in: '1h' });

        expect(logs.at('warn')).toEqual([]);
    });

    describe('rejects', () => {
        // every case here fails before it stores anything, so one plugin serves them all
        const shared = new FakeDriver();
        let tasks: Tasks;

        beforeAll(async () => {
            ({ tasks } = await start(jobs, shared));
            return () => tasks.dispose();
        });

        it('a duration parseDuration cannot read', async () => {
            const duration = String('soon');

            await expect(tasks.schedule(Reminder, { in: duration })).rejects.toMatchObject({
                code: SeedcordErrorCode.InvalidDuration
            });
        });

        it('a duration that ends past the last date a Date can hold, and stores nothing', async () => {
            const duration = String('100000001d');

            await expect(tasks.schedule(Reminder, { in: duration })).rejects.toMatchObject({
                type: 'SeedcordRangeError',
                code: SeedcordErrorCode.PluginTasksDurationTooLong
            });
            expect(shared.stored.size).toBe(0);
        });

        it('an at in seconds', async () => {
            const seconds = Math.floor(Date.now() / SECOND_MS);

            await expect(tasks.schedule(Reminder, { at: seconds })).rejects.toMatchObject({
                type: 'SeedcordRangeError',
                code: SeedcordErrorCode.PluginTasksAtTooEarly
            });
        });

        it.each([new Date('nope'), Number.NaN])('the invalid date %s', async (at) => {
            await expect(tasks.schedule(Reminder, { at })).rejects.toMatchObject({
                type: 'SeedcordTypeError',
                code: SeedcordErrorCode.PluginTasksInvalidOption
            });
        });

        it.each([0, -1])('the at %s, as a likely missing value', async (at) => {
            await expect(tasks.schedule(Reminder, { at })).rejects.toMatchObject({
                type: 'SeedcordRangeError',
                code: SeedcordErrorCode.PluginTasksAtTooEarly
            });
        });

        it('data with a cycle, and stores nothing', async () => {
            const data = { text: 'hi', sentAt: new Date() };
            Object.assign(data, { self: data });

            await expect(tasks.schedule(Note, { in: '1s', data })).rejects.toMatchObject({
                code: SeedcordErrorCode.CoreKvUnserializable
            });
            expect(shared.stored.size).toBe(0);
        });

        it('a class that shares its key with a loaded task, and stores nothing', async () => {
            const scheduling = tasks.schedule(TwinReminder, { in: '1s', data: { text: 'hi' } });

            await expect(scheduling).rejects.toMatchObject({ code: SeedcordErrorCode.PluginTasksKeyTaken });
            await expect(scheduling).rejects.toThrow('jobs/Reminder.ts');
            expect(shared.stored.size).toBe(0);
        });

        it('a task the plugin did not load', async () => {
            await using booted = await start(partial, driver);
            const { tasks: partialTasks } = booted;

            await expect(partialTasks.schedule(Reminder, { in: '1s' })).rejects.toMatchObject({
                code: SeedcordErrorCode.PluginTasksNotLoaded
            });
        });
    });
});
