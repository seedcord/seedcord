import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { Tasks } from '#src/Tasks';
import { Spaced } from '#tests/fixtures/every/Spaced';
import { Reminder } from '#tests/fixtures/jobs/Reminder';
import { Noon } from '#tests/fixtures/resume/Noon';
import { Twice } from '#tests/fixtures/resume/Twice';
import { Idle } from '#tests/fixtures/tasks/Idle';
import { Slow } from '#tests/fixtures/tasks/Slow';
import { Tick } from '#tests/fixtures/tasks/Tick';
import { Loose } from '#tests/fixtures/unprotected/Loose';
import { FakeDriver, TestHost, boot, captureLogs, start } from '#tests/utils/host';
import { tempFolder } from '#tests/utils/tempFolder';

import type { TasksOptions } from '#src/types/Tasks';
import type { Run } from '#tests/utils/host';

const fixtures = path.resolve(import.meta.dirname, 'fixtures');
const taskFolder = path.join(fixtures, 'tasks');
const crons: TasksOptions = { path: taskFolder };

const SECOND_MS = 1000;
const DAY_MS = 86_400_000;

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

    it("doesn't set a timer or run anything before ready", async () => {
        await using booted = await boot(crons);
        const { host, tasks } = booted;
        expect(vi.getTimerCount()).toBe(0);

        await vi.advanceTimersByTimeAsync(SECOND_MS * 3);
        expect(host.runs).toEqual([]);

        tasks.ready();
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(runsOf(host, 'Tick')).toHaveLength(1);
    });

    it('runs a class exported twice once per tick', async () => {
        await using booted = await start(crons);
        const { host } = booted;

        await vi.advanceTimersByTimeAsync(SECOND_MS * 2);

        expect(runsOf(host, 'Tick')).toEqual([
            { task: 'Tick', trigger: 'cron', data: undefined },
            { task: 'Tick', trigger: 'cron', data: undefined }
        ]);
    });

    it('runs nothing after dispose', async () => {
        await using booted = await start(crons);
        const { host, tasks } = booted;
        await tasks.dispose();

        await vi.advanceTimersByTimeAsync(SECOND_MS * 2);

        expect(host.runs).toEqual([]);
    });

    it('leaves a task saved after dispose stopped', async () => {
        await using booted = await start(crons);
        const { tasks } = booted;
        await tasks.dispose();

        await tasks.onHmr({ file: path.join(taskFolder, 'Slow.ts'), type: 'update' });

        expect(tasks.crons().find((status) => status.key === 'slow')?.active).toBe(false);
        expect(vi.getTimerCount()).toBe(0);
    });

    describe('pause and resume', () => {
        it('leaves a task that starts paused until resume', async () => {
            await using booted = await start(crons);
            const { host, tasks } = booted;

            await vi.advanceTimersByTimeAsync(SECOND_MS);
            expect(runsOf(host, 'Idle')).toEqual([]);
            expect(tasks.crons().find((status) => status.key === 'Idle')?.active).toBe(false);

            tasks.resume(Idle);
            await vi.advanceTimersByTimeAsync(SECOND_MS);
            expect(runsOf(host, 'Idle')).toHaveLength(1);
        });

        it('keeps a task paused before ready paused through ready', async () => {
            await using booted = await boot(crons);
            const { host, tasks } = booted;

            tasks.pause(Tick);
            tasks.ready();
            await vi.advanceTimersByTimeAsync(SECOND_MS);

            expect(runsOf(host, 'Tick')).toEqual([]);
        });

        it.each([
            { pausedBy: 'pause()', Task: Tick, resumed: 'before ready' },
            { pausedBy: 'pause()', Task: Tick, resumed: 'after ready' },
            { pausedBy: 'the decorator', Task: Idle, resumed: 'before ready' }
        ] as const)('runs a task paused by $pausedBy and resumed $resumed', async ({ pausedBy, Task, resumed }) => {
            await using booted = await boot(crons);
            const { host, tasks } = booted;

            if (pausedBy === 'pause()') tasks.pause(Task);
            if (resumed === 'before ready') tasks.resume(Task);
            tasks.ready();
            if (resumed === 'after ready') tasks.resume(Task);
            await vi.advanceTimersByTimeAsync(SECOND_MS);

            expect(runsOf(host, Task.name)).not.toEqual([]);
        });

        it('pauses a running task', async () => {
            await using booted = await start(crons);
            const { host, tasks } = booted;

            tasks.pause(Tick);
            await vi.advanceTimersByTimeAsync(SECOND_MS * 2);

            expect(runsOf(host, 'Tick')).toEqual([]);
        });

        describe('after a pause that skipped a run', () => {
            // Noon runs at 12:00:00 each day, and Twice every second until it has run twice
            const startResume = (): ReturnType<typeof start> =>
                start({ path: path.join(fixtures, 'resume'), timezone: 'UTC' });

            it('waits for the next match instead of running the skipped one', async () => {
                vi.setSystemTime(new Date('2030-01-15T11:59:59Z'));
                await using booted = await startResume();
                const { host, tasks } = booted;
                await vi.advanceTimersByTimeAsync(SECOND_MS);

                tasks.pause(Noon);
                await vi.advanceTimersByTimeAsync(DAY_MS + SECOND_MS * 3600);
                tasks.resume(Noon);
                await vi.advanceTimersByTimeAsync(SECOND_MS * 60);

                expect(runsOf(host, 'Noon')).toHaveLength(1);
                expect(tasks.nextRun(Noon)).toEqual(new Date('2030-01-17T12:00:00Z'));
                expect(tasks.crons().find((status) => status.key === 'Noon')?.previousRun).toEqual(
                    new Date('2030-01-15T12:00:00Z')
                );
            });

            it('keeps the runs a task has left', async () => {
                await using booted = await startResume();
                const { host, tasks } = booted;
                await vi.advanceTimersByTimeAsync(SECOND_MS);

                tasks.pause(Twice);
                tasks.resume(Twice);
                await vi.advanceTimersByTimeAsync(SECOND_MS * 3);

                expect(runsOf(host, 'Twice')).toHaveLength(2);
            });
        });
    });

    it('runs a task now through trigger', async () => {
        await using booted = await start(crons);
        const { host, tasks } = booted;

        await tasks.trigger(Reminder);
        await tasks.trigger(Slow);

        expect(host.runs).toEqual([
            { task: 'reminder', trigger: 'manual', data: undefined },
            { task: 'slow', trigger: 'manual', data: undefined }
        ]);
    });

    it('skips a protected run while the last one is still running and calls onOverrun', async () => {
        using logs = captureLogs();
        await using booted = await start(crons);
        const { host, tasks } = booted;
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
    });

    it('logs an onOverrun that throws and carries on', async () => {
        using logs = captureLogs();
        await using booted = await start(crons);
        const { host, tasks } = booted;
        host.hold();
        host.failOverrun = true;

        const first = tasks.trigger(Slow);
        await tasks.trigger(Slow);
        expect(logs.at('error')).toEqual([expect.stringContaining('threw from onOverrun')]);

        host.release();
        await first;
        await tasks.trigger(Slow);
        expect(host.runs.filter((run) => run.task === 'slow')).toHaveLength(2);
    });

    it('waits for onOverrun during dispose', async () => {
        using _logs = captureLogs();
        await using booted = await start(crons);
        const { host, tasks } = booted;
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

    it("doesn't call onOverrun once dispose has started", async () => {
        using _logs = captureLogs();
        await using booted = await start(crons);
        const { host, tasks } = booted;
        host.hold();

        const first = tasks.trigger(Slow);
        const disposing = tasks.dispose();
        await tasks.trigger(Slow);
        host.release();
        await Promise.all([first, disposing]);

        expect(runsOf(host, 'overrun')).toEqual([]);
    });

    it('reports busy until every unprotected run finishes', async () => {
        await using booted = await start({ path: path.join(fixtures, 'unprotected') });
        const { host, tasks } = booted;
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
    });

    it('keeps a running task busy across a save', async () => {
        await using booted = await start(crons);
        const { host, tasks } = booted;
        host.hold();
        const run = tasks.trigger(Slow);

        await tasks.onHmr({ file: path.join(taskFolder, 'Slow.ts'), type: 'update' });
        expect(tasks.crons().find((status) => status.key === 'slow')?.busy).toBe(true);

        host.release();
        await run;
    });

    describe('run state', () => {
        it('skips a run the task starts on itself before its first await', async () => {
            using _logs = captureLogs();
            await using booted = await start(crons);
            const { host, tasks } = booted;
            host.reenter = () => tasks.trigger(Slow);

            await tasks.trigger(Slow);

            expect(host.runs).toEqual([
                { task: 'slow', trigger: 'manual', data: undefined },
                { task: 'overrun', trigger: 'manual', data: undefined }
            ]);
        });

        it('runs a scheduled job of a protected task once the run before it ends', async () => {
            await using booted = await start(crons);
            const { host, tasks } = booted;
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
        });

        it('keeps a job that waited on a protected run stored when dispose interrupts it', async () => {
            using driver = new FakeDriver();
            await using booted = await start(crons, driver);
            const { host, tasks } = booted;
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

        it('cancels a scheduled job while it waits for the protected run before it', async () => {
            using driver = new FakeDriver();
            await using booted = await start(crons, driver);
            const { host, tasks } = booted;
            host.hold();

            const first = tasks.trigger(Slow);
            const job = await tasks.schedule(Slow, { in: '1s' });
            await vi.advanceTimersByTimeAsync(SECOND_MS);

            await expect(tasks.cancel(job.id)).resolves.toBe(true);
            host.release();
            await first;
            await vi.advanceTimersByTimeAsync(0);

            expect(runsOf(host, 'slow')).toEqual([{ task: 'slow', trigger: 'manual', data: undefined }]);
            expect(driver.stored.size).toBe(0);
        });

        it('runs a waiting job whose cancel could not delete it', async () => {
            using driver = new FakeDriver();
            await using booted = await start(crons, driver);
            const { host, tasks } = booted;
            host.hold();

            const first = tasks.trigger(Slow);
            const job = await tasks.schedule(Slow, { in: '1s' });
            await vi.advanceTimersByTimeAsync(SECOND_MS);

            const release = driver.holdDeletes({ fail: true });
            const cancelling = tasks.cancel(job.id);
            host.release();
            await first;
            await vi.advanceTimersByTimeAsync(0);
            release();

            await expect(cancelling).rejects.toMatchObject({ code: SeedcordErrorCode.CoreKvDriverFailed });
            await vi.advanceTimersByTimeAsync(0);
            expect(runsOf(host, 'slow')).toEqual([
                { task: 'slow', trigger: 'manual', data: undefined },
                { task: 'slow', trigger: 'scheduled', data: undefined }
            ]);
        });

        it('runs a paused task through trigger and a scheduled job', async () => {
            await using booted = await start(crons);
            const { host, tasks } = booted;
            tasks.pause(Tick);

            await tasks.trigger(Tick);
            await tasks.schedule(Tick, { in: '1s' });
            await vi.advanceTimersByTimeAsync(SECOND_MS * 2);

            expect(runsOf(host, 'Tick')).toEqual([
                { task: 'Tick', trigger: 'manual', data: undefined },
                { task: 'Tick', trigger: 'scheduled', data: undefined }
            ]);
        });

        it('applies a paused option changed in a save', async () => {
            await using folder = await tempFolder('paused-save');
            const file = path.join(folder.path, 'Flip.ts');
            const source = (paused: boolean): string =>
                [
                    "import { RegisterTask } from '#src/decorators/RegisterTask';",
                    "import { Task } from '#src/Task';",
                    `@RegisterTask('* * * * * *', { paused: ${String(paused)} })`,
                    'export class Flip extends Task {',
                    '    public async execute(): Promise<void> {}',
                    '}'
                ].join('\n');

            await writeFile(file, source(true));
            await using booted = await start({ path: folder.path });

            await writeFile(file, source(false));
            await booted.tasks.onHmr({ file, type: 'update' });

            expect(booted.tasks.crons()[0]?.active).toBe(true);
        });

        it('keeps what resume did across a save', async () => {
            await using booted = await start(crons);
            const { host, tasks } = booted;
            tasks.resume(Idle);

            await tasks.onHmr({ file: path.join(taskFolder, 'Idle.ts'), type: 'update' });
            await vi.advanceTimersByTimeAsync(SECOND_MS);

            expect(runsOf(host, 'Idle')).toHaveLength(1);
        });
    });

    it('reports its state through list and nextRun', async () => {
        await using booted = await start(crons);
        const { host, tasks } = booted;
        host.hold();
        const run = tasks.trigger(Slow);

        expect(tasks.crons().find((status) => status.key === 'slow')).toEqual({
            key: 'slow',
            pattern: '0 0 1 1 *',
            timezone: 'America/New_York',
            active: true,
            busy: true,
            nextRun: new Date('2031-01-01T05:00:00.000Z'),
            previousRun: null
        });
        expect(tasks.nextRun(Slow)?.toISOString()).toBe('2031-01-01T05:00:00.000Z');

        host.release();
        await run;
    });

    it('returns null for the next run while a task is paused', async () => {
        await using booted = await start(crons);
        const { tasks } = booted;

        tasks.pause(Slow);
        expect(tasks.nextRun(Slow)).toBeNull();
        expect(tasks.crons().find((status) => status.key === 'slow')?.nextRun).toBeNull();

        tasks.resume(Slow);
        expect(tasks.nextRun(Slow)?.toISOString()).toBe('2031-01-01T05:00:00.000Z');
    });

    it('applies the plugin timezone to a task without one', async () => {
        await using booted = await start({ path: path.join(fixtures, 'resume'), timezone: 'Asia/Tokyo' });

        // Noon runs at 12:00 Tokyo time, which is 03:00 UTC
        expect(booted.tasks.nextRun(Noon)).toEqual(new Date('2030-01-16T03:00:00Z'));
    });

    it('throws for pause on a task without a pattern', async () => {
        await using booted = await boot(crons);
        const { tasks } = booted;

        expect(() => {
            tasks.pause(Reminder);
        }).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginTasksPatternMissing, type: 'SeedcordTypeError' })
        );
    });

    it('swaps a class on a save and stops it on a delete', async () => {
        await using booted = await start(crons);
        const { tasks } = booted;
        const file = path.join(taskFolder, 'Idle.ts');
        const keys = (): string[] => tasks.crons().map((status) => status.key);

        await tasks.onHmr({ file, type: 'update' });
        // the save loaded a fresh copy. The class that this file imported is a different one now
        expect(() => {
            tasks.pause(Idle);
        }).toThrow(expect.objectContaining({ code: SeedcordErrorCode.PluginTasksKeyTaken }));
        expect(keys()).toContain('Idle');

        await tasks.onHmr({ file, type: 'delete' });
        expect(keys()).not.toContain('Idle');
    });

    describe('maxRuns', () => {
        // Capped matches every second and holds each run until host.release()
        const startCapped = async (): ReturnType<typeof start> => {
            const booted = await boot({ path: path.join(fixtures, 'limited'), timezone: 'UTC' });
            booted.host.hold();
            booted.tasks.ready();
            await vi.advanceTimersByTimeAsync(SECOND_MS * 3);
            return booted;
        };

        it('counts only the runs that start toward maxRuns', async () => {
            await using booted = await startCapped();
            const { host, tasks } = booted;

            host.release();
            await vi.advanceTimersByTimeAsync(SECOND_MS * 3);

            expect(runsOf(host, 'Capped')).toHaveLength(2);
            expect(tasks.crons().find((status) => status.key === 'Capped')?.active).toBe(false);
        });

        it('reports the last run that started as the previous run', async () => {
            await using booted = await startCapped();
            const { host, tasks } = booted;
            const { previousRun } = tasks.crons().find((status) => status.key === 'Capped') ?? {};
            host.release();

            expect(previousRun).toEqual(new Date('2030-01-15T12:00:01Z'));
        });
    });

    describe('every', () => {
        // Spaced matches every second of 12:00 to 12:59 UTC, with every: '90s'
        const startEvery = (): ReturnType<typeof start> =>
            start({ path: path.join(fixtures, 'every'), timezone: 'UTC' });

        it.each([
            { folder: 'every', task: 'Spaced', now: '2030-01-15T11:59:59Z' },
            // Late's startAt passed 100 seconds before ready
            { folder: 'every-started', task: 'Late', now: '2030-01-15T12:00:00Z' }
        ])('runs $task at its first match, then spaces runs by every', async ({ folder, task, now }) => {
            vi.setSystemTime(new Date(now));
            await using booted = await start({ path: path.join(fixtures, folder), timezone: 'UTC' });
            const { host } = booted;
            const runsAfter = async (seconds: number): Promise<number> => {
                await vi.advanceTimersByTimeAsync(SECOND_MS * seconds);
                return runsOf(host, task).length;
            };

            expect(await runsAfter(1)).toBe(1);
            expect(await runsAfter(89)).toBe(1);
            expect(await runsAfter(1)).toBe(2);
        });

        it('reports the next run every after the last one', async () => {
            vi.setSystemTime(new Date('2030-01-15T12:00:00Z'));
            await using booted = await startEvery();
            const { tasks } = booted;

            await vi.advanceTimersByTimeAsync(SECOND_MS * 45);
            const [status] = tasks.crons();

            expect(status?.nextRun?.getTime()).toBe((status?.previousRun?.getTime() ?? 0) + SECOND_MS * 90);
        });

        it('runs at the first match after resume', async () => {
            vi.setSystemTime(new Date('2030-01-15T12:00:00Z'));
            await using booted = await startEvery();
            const { host, tasks } = booted;
            await vi.advanceTimersByTimeAsync(SECOND_MS);

            tasks.pause(Spaced);
            await vi.advanceTimersByTimeAsync(SECOND_MS * 600);
            tasks.resume(Spaced);
            expect(tasks.nextRun(Spaced)).toEqual(new Date(Date.now() + SECOND_MS));

            await vi.advanceTimersByTimeAsync(SECOND_MS);
            expect(runsOf(host, 'Spaced')).toHaveLength(2);
        });
    });

    describe('at startup', () => {
        it.each([
            ['duplicate-key', SeedcordErrorCode.CoreDuplicateName],
            ['bad-start', SeedcordErrorCode.PluginTasksInvalidOption],
            ['stop-before-start', SeedcordErrorCode.PluginTasksInvalidOption],
            ['bad-max-runs', SeedcordErrorCode.PluginTasksInvalidOption],
            ['bad-every', SeedcordErrorCode.PluginTasksInvalidOption],
            ['every-not-duration', SeedcordErrorCode.InvalidDuration],
            ['date-pattern', SeedcordErrorCode.PluginTasksInvalidOption],
            ['bad-timezone', SeedcordErrorCode.PluginTasksInvalidOption],
            ['bad-pattern', SeedcordErrorCode.PluginTasksInvalidPattern]
        ])('rejects %s', async (folder, code) => {
            await expect(boot({ path: path.join(fixtures, folder) })).rejects.toMatchObject({ code });
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
                expect.objectContaining({ code: SeedcordErrorCode.PluginOptionsRejected })
            );
        });
    });
});
