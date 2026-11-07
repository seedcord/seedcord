import path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tasks } from '#src/Tasks';
import { Reminder } from '#tests/fixtures/jobs/Reminder';
import { Idle } from '#tests/fixtures/tasks/Idle';
import { Slow } from '#tests/fixtures/tasks/Slow';
import { Tick } from '#tests/fixtures/tasks/Tick';
import { Loose } from '#tests/fixtures/unprotected/Loose';
import { FakeDriver, TestHost, boot, captureLogs, start } from '#tests/utils/host';

import type { TasksOptions } from '#src/types/Tasks';
import type { Run } from '#tests/utils/host';

const fixtures = path.resolve(import.meta.dirname, 'fixtures');
const taskFolder = path.join(fixtures, 'tasks');
const crons: TasksOptions = { path: taskFolder };

const SECOND_MS = 1000;

const runsOf = (host: TestHost, task: string): Run[] => host.runs.filter((run) => run.task === task);

describe('Tasks cron tasks', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2030-01-15T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('does not fire before ready', async () => {
        const { host, tasks } = await boot(crons);

        await vi.advanceTimersByTimeAsync(SECOND_MS * 3);
        expect(host.runs).toEqual([]);

        await tasks.ready();
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(runsOf(host, 'Tick')).toHaveLength(1);

        await tasks.dispose();
    });

    it('runs a class exported twice once per tick', async () => {
        const { host, tasks } = await start(crons);

        await vi.advanceTimersByTimeAsync(SECOND_MS * 2);

        expect(runsOf(host, 'Tick')).toEqual([
            { task: 'Tick', trigger: 'cron', data: undefined },
            { task: 'Tick', trigger: 'cron', data: undefined }
        ]);
        await tasks.dispose();
    });

    it('stops firing after dispose', async () => {
        const { host, tasks } = await start(crons);
        await tasks.dispose();

        await vi.advanceTimersByTimeAsync(SECOND_MS * 2);

        expect(host.runs).toEqual([]);
    });

    it('leaves a paused task until resume', async () => {
        const { host, tasks } = await start(crons);

        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(runsOf(host, 'Idle')).toEqual([]);

        tasks.resume(Idle);
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(runsOf(host, 'Idle')).toHaveLength(1);

        await tasks.dispose();
    });

    it('keeps a task paused before ready paused through ready', async () => {
        const { host, tasks } = await boot(crons);

        tasks.pause(Tick);
        await tasks.ready();
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(runsOf(host, 'Tick')).toEqual([]);
        await tasks.dispose();
    });

    it('starts a task resumed before ready once ready runs', async () => {
        const { host, tasks } = await boot(crons);

        tasks.resume(Idle);
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(runsOf(host, 'Idle')).toEqual([]);

        await tasks.ready();
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(runsOf(host, 'Idle')).toHaveLength(1);

        await tasks.dispose();
    });

    it('pauses a running task', async () => {
        const { host, tasks } = await start(crons);

        tasks.pause(Tick);
        await vi.advanceTimersByTimeAsync(SECOND_MS * 2);

        expect(runsOf(host, 'Tick')).toEqual([]);
        await tasks.dispose();
    });

    it('runs a task now through trigger', async () => {
        const { host, tasks } = await start(crons);

        await tasks.trigger(Reminder);
        await tasks.trigger(Slow);

        expect(host.runs).toEqual([
            { task: 'reminder', trigger: 'manual', data: undefined },
            { task: 'slow', trigger: 'manual', data: undefined }
        ]);
        await tasks.dispose();
    });

    it('skips a protected run while the last one is still running and calls onOverrun', async () => {
        using logs = captureLogs();
        const { host, tasks } = await start(crons);
        host.hold();

        const first = tasks.trigger(Slow);
        await tasks.trigger(Slow);

        expect(host.runs).toEqual([
            { task: 'slow', trigger: 'manual', data: undefined },
            { task: 'overrun', trigger: 'manual', data: undefined }
        ]);
        expect(logs.at('warn')).toEqual([expect.stringContaining('skipped a run of')]);

        host.release();
        await first;
        await tasks.dispose();
    });

    it('logs an onOverrun that throws and carries on', async () => {
        using logs = captureLogs();
        const { host, tasks } = await start(crons);
        host.hold();
        host.failOverrun = true;

        const first = tasks.trigger(Slow);
        await tasks.trigger(Slow);
        expect(logs.at('error')).toEqual([expect.stringContaining('threw during its overrun')]);

        host.release();
        await first;
        await tasks.trigger(Slow);
        expect(host.runs.filter((run) => run.task === 'slow')).toHaveLength(2);
        await tasks.dispose();
    });

    it('waits for onOverrun during dispose', async () => {
        using _logs = captureLogs();
        const { host, tasks } = await start(crons);
        host.hold();
        host.holdOverrun();

        const first = tasks.trigger(Slow);
        const second = tasks.trigger(Slow);
        host.release();
        await first;

        let disposed = false;
        const disposing = tasks.dispose().then(() => {
            disposed = true;
        });
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(disposed).toBe(false);

        host.releaseOverrun();
        await Promise.all([second, disposing]);
        expect(disposed).toBe(true);
    });

    it('stays busy until every unprotected run finishes', async () => {
        const { host, tasks } = await start({ path: path.join(fixtures, 'unprotected') });
        const long = Promise.withResolvers<undefined>();
        const short = Promise.withResolvers<undefined>();
        host.gates.push(long.promise, short.promise);

        const first = tasks.trigger(Loose);
        const second = tasks.trigger(Loose);
        short.resolve(undefined);
        await second;
        expect(tasks.crons()[0]?.busy).toBe(true);

        long.resolve(undefined);
        await first;
        expect(tasks.crons()[0]?.busy).toBe(false);
        await tasks.dispose();
    });

    it('keeps a running task busy across a save', async () => {
        const { host, tasks } = await start(crons);
        host.hold();
        const run = tasks.trigger(Slow);

        await tasks.onHmr({ file: path.join(taskFolder, 'Slow.ts'), type: 'update' });
        expect(tasks.crons().find((status) => status.key === 'slow')?.busy).toBe(true);

        host.release();
        await run;
        await tasks.dispose();
    });

    describe('run state', () => {
        it('skips a run the task starts on itself before its first await', async () => {
            using _logs = captureLogs();
            const { host, tasks } = await start(crons);
            host.reenter = () => tasks.trigger(Slow);

            await tasks.trigger(Slow);

            expect(host.runs).toEqual([
                { task: 'slow', trigger: 'manual', data: undefined },
                { task: 'overrun', trigger: 'manual', data: undefined }
            ]);
            await tasks.dispose();
        });

        it('runs a scheduled job of a protected task once the run before it ends', async () => {
            const { host, tasks } = await start(crons);
            host.hold();

            const first = tasks.trigger(Slow);
            await tasks.schedule(Slow, { in: '1s' });
            await vi.advanceTimersByTimeAsync(SECOND_MS);
            expect(runsOf(host, 'slow')).toEqual([{ task: 'slow', trigger: 'manual', data: undefined }]);

            host.release();
            await first;
            await vi.advanceTimersByTimeAsync(0);

            expect(runsOf(host, 'slow')).toEqual([
                { task: 'slow', trigger: 'manual', data: undefined },
                { task: 'slow', trigger: 'scheduled', data: undefined }
            ]);
            expect(tasks.jobs()).toEqual([]);
            await tasks.dispose();
        });

        it('keeps a job that waited on a protected run stored when dispose interrupts it', async () => {
            using driver = new FakeDriver();
            const { host, tasks } = await start(crons, driver);
            host.hold();

            void tasks.trigger(Slow);
            await tasks.schedule(Slow, { in: '1s' });
            await vi.advanceTimersByTimeAsync(SECOND_MS);

            const disposing = tasks.dispose();
            host.release();
            await disposing;

            expect(runsOf(host, 'slow')).toEqual([{ task: 'slow', trigger: 'manual', data: undefined }]);
            expect(driver.stored.size).toBe(1);
        });

        it('runs a paused task through trigger and a scheduled job', async () => {
            const { host, tasks } = await start(crons);
            tasks.pause(Tick);

            await tasks.trigger(Tick);
            await tasks.schedule(Tick, { in: '1s' });
            await vi.advanceTimersByTimeAsync(SECOND_MS * 2);

            expect(runsOf(host, 'Tick')).toEqual([
                { task: 'Tick', trigger: 'manual', data: undefined },
                { task: 'Tick', trigger: 'scheduled', data: undefined }
            ]);
            await tasks.dispose();
        });

        it('keeps what resume did across a save', async () => {
            const { host, tasks } = await start(crons);
            tasks.resume(Idle);

            await tasks.onHmr({ file: path.join(taskFolder, 'Idle.ts'), type: 'update' });
            await vi.advanceTimersByTimeAsync(SECOND_MS);

            expect(runsOf(host, 'Idle')).toHaveLength(1);
            await tasks.dispose();
        });
    });

    it('reports its state through list and nextRun', async () => {
        const { host, tasks } = await start(crons);
        host.hold();
        const run = tasks.trigger(Slow);

        expect(tasks.crons().find((status) => status.key === 'slow')).toEqual({
            key: 'slow',
            pattern: '0 0 1 1 *',
            timezone: 'America/New_York',
            active: true,
            busy: true,
            nextRun: tasks.nextRun(Slow),
            previousRun: null
        });
        expect(tasks.nextRun(Slow)?.toISOString()).toBe('2031-01-01T05:00:00.000Z');

        host.release();
        await run;
        await tasks.dispose();
    });

    it('reports no next run while a task is paused', async () => {
        const { tasks } = await start(crons);

        tasks.pause(Slow);
        expect(tasks.nextRun(Slow)).toBeNull();
        expect(tasks.crons().find((status) => status.key === 'slow')?.nextRun).toBeNull();

        tasks.resume(Slow);
        expect(tasks.nextRun(Slow)?.toISOString()).toBe('2031-01-01T05:00:00.000Z');

        await tasks.dispose();
    });

    it('applies the plugin timezone to a task without one', async () => {
        const { tasks } = await start({ ...crons, timezone: 'Asia/Tokyo' });

        expect(tasks.crons().find((status) => status.key === 'Tick')?.timezone).toBe('Asia/Tokyo');
        expect(tasks.crons().find((status) => status.key === 'slow')?.timezone).toBe('America/New_York');

        await tasks.dispose();
    });

    it('throws for pause on a task without a pattern', async () => {
        const { tasks } = await boot(crons);

        expect(() => {
            tasks.pause(Reminder);
        }).toThrow(expect.objectContaining({ code: SeedcordErrorCode.PluginTasksPatternMissing }));
        await tasks.dispose();
    });

    it('swaps a class on a save and stops it on a delete', async () => {
        const { tasks } = await start(crons);
        const file = path.join(taskFolder, 'Idle.ts');
        const keys = (): string[] => tasks.crons().map((status) => status.key);

        await tasks.onHmr({ file, type: 'update' });
        expect(keys().filter((key) => key === 'Idle')).toHaveLength(1);

        await tasks.onHmr({ file, type: 'delete' });
        expect(keys()).not.toContain('Idle');

        await tasks.dispose();
    });

    describe('at startup', () => {
        it.each([
            ['duplicate-key', SeedcordErrorCode.CoreDuplicateName],
            ['bad-start', SeedcordErrorCode.PluginTasksInvalidDate],
            ['date-pattern', SeedcordErrorCode.PluginTasksDateAsPattern],
            ['bad-timezone', SeedcordErrorCode.PluginTasksInvalidTimezone],
            ['bad-pattern', SeedcordErrorCode.PluginTasksInvalidPattern]
        ])('rejects %s', async (folder, code) => {
            await expect(boot({ path: path.join(fixtures, folder) })).rejects.toMatchObject({ code });
        });

        it('stops the crons it built when init fails', async () => {
            const host = new TestHost(new FakeDriver());
            const { tasks } = host.attach('tasks', Tasks, { path: path.join(fixtures, 'bad-pattern') });

            await expect(tasks.init()).rejects.toThrow();

            expect(tasks.crons()).toEqual([expect.objectContaining({ key: 'AGood', active: false, nextRun: null })]);
        });

        it('rejects an empty path', () => {
            const host = new TestHost(new FakeDriver());

            expect(() => host.attach('tasks', Tasks, { path: '' })).toThrow(
                expect.objectContaining({ code: SeedcordErrorCode.PluginOptionsRejected })
            );
        });

        it('rejects a plugin timezone that is not IANA', () => {
            const host = new TestHost(new FakeDriver());
            // justified: a value from .env reaches this check through a cast
            const timezone = 'America/New_Yrok' as TasksOptions['timezone'] & string;

            expect(() => host.attach('tasks', Tasks, { path: taskFolder, timezone })).toThrow(
                expect.objectContaining({ code: SeedcordErrorCode.PluginTasksInvalidTimezone })
            );
        });
    });
});
