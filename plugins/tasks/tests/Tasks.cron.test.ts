import path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tasks } from '#src/Tasks';
import { Reminder } from '#tests/fixtures/jobs/Reminder';
import { Idle } from '#tests/fixtures/tasks/Idle';
import { Slow } from '#tests/fixtures/tasks/Slow';
import { Tick } from '#tests/fixtures/tasks/Tick';
import { Loose } from '#tests/fixtures/unprotected/Loose';
import { FakeDriver, TestHost } from '#tests/utils/host';

import type { TasksOptions } from '#src/types/Tasks';
import type { Run } from '#tests/utils/host';

const fixtures = path.resolve(import.meta.dirname, 'fixtures');
const taskFolder = path.join(fixtures, 'tasks');

const SECOND_MS = 1000;

interface Booted {
    host: TestHost;
    tasks: Tasks;
}

async function boot(options: Partial<TasksOptions> = {}): Promise<Booted> {
    const host = new TestHost(new FakeDriver());
    const bot = host.attach('tasks', Tasks, { path: taskFolder, ...options });
    await bot.tasks.init();
    return { host, tasks: bot.tasks };
}

async function start(options: Partial<TasksOptions> = {}): Promise<Booted> {
    const booted = await boot(options);
    await booted.tasks.ready();
    return booted;
}

const runsOf = (host: TestHost, task: string): Run[] => host.runs.filter((run) => run.task === task);

describe('Tasks cron tasks', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2030-01-15T12:00:00Z'));
        vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('does not fire before ready', async () => {
        const { host, tasks } = await boot();

        await vi.advanceTimersByTimeAsync(SECOND_MS * 3);
        expect(host.runs).toEqual([]);

        await tasks.ready();
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(runsOf(host, 'Tick')).toHaveLength(1);

        await tasks.dispose();
    });

    it('runs a class exported twice once per tick', async () => {
        const { host, tasks } = await start();

        await vi.advanceTimersByTimeAsync(SECOND_MS * 2);

        expect(runsOf(host, 'Tick')).toEqual([
            { task: 'Tick', trigger: 'cron', data: undefined },
            { task: 'Tick', trigger: 'cron', data: undefined }
        ]);
        await tasks.dispose();
    });

    it('stops firing after dispose', async () => {
        const { host, tasks } = await start();
        await tasks.dispose();

        await vi.advanceTimersByTimeAsync(SECOND_MS * 2);

        expect(host.runs).toEqual([]);
    });

    it('leaves a paused task until resume', async () => {
        const { host, tasks } = await start();

        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(runsOf(host, 'Idle')).toEqual([]);

        tasks.resume(Idle);
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(runsOf(host, 'Idle')).toHaveLength(1);

        await tasks.dispose();
    });

    it('keeps a task paused before ready paused through ready', async () => {
        const { host, tasks } = await boot();

        tasks.pause(Tick);
        await tasks.ready();
        await vi.advanceTimersByTimeAsync(SECOND_MS);

        expect(runsOf(host, 'Tick')).toEqual([]);
        await tasks.dispose();
    });

    it('starts a task resumed before ready once ready runs', async () => {
        const { host, tasks } = await boot();

        tasks.resume(Idle);
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(runsOf(host, 'Idle')).toEqual([]);

        await tasks.ready();
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        expect(runsOf(host, 'Idle')).toHaveLength(1);

        await tasks.dispose();
    });

    it('pauses a running task', async () => {
        const { host, tasks } = await start();

        tasks.pause(Tick);
        await vi.advanceTimersByTimeAsync(SECOND_MS * 2);

        expect(runsOf(host, 'Tick')).toEqual([]);
        await tasks.dispose();
    });

    it('runs a task now through trigger', async () => {
        const { host, tasks } = await start();

        await tasks.trigger(Reminder);
        await tasks.trigger(Slow);

        expect(host.runs).toEqual([
            { task: 'reminder', trigger: 'manual', data: undefined },
            { task: 'slow', trigger: 'manual', data: undefined }
        ]);
        await tasks.dispose();
    });

    it('skips a protected run while the last one is going and calls onOverrun', async () => {
        const { host, tasks } = await start();
        host.hold();

        const first = tasks.trigger(Slow);
        await tasks.trigger(Slow);

        expect(host.runs).toEqual([
            { task: 'slow', trigger: 'manual', data: undefined },
            { task: 'overrun', trigger: 'manual', data: undefined }
        ]);

        host.release();
        await first;
        await tasks.dispose();
    });

    it('waits for onOverrun during dispose', async () => {
        const { host, tasks } = await start();
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
        expect(tasks.list()[0]?.busy).toBe(true);

        long.resolve(undefined);
        await first;
        expect(tasks.list()[0]?.busy).toBe(false);
        await tasks.dispose();
    });

    it('keeps a running task busy across a save', async () => {
        const { host, tasks } = await start();
        host.hold();
        const run = tasks.trigger(Slow);

        await tasks.onHmr({ file: path.join(taskFolder, 'Slow.ts'), type: 'update' });
        expect(tasks.list().find((status) => status.key === 'slow')?.busy).toBe(true);

        host.release();
        await run;
        await tasks.dispose();
    });

    it('reports its state through list and nextRun', async () => {
        const { host, tasks } = await start();
        host.hold();
        const run = tasks.trigger(Slow);

        expect(tasks.list().find((status) => status.key === 'slow')).toEqual({
            key: 'slow',
            pattern: '0 0 1 1 *',
            timezone: 'Europe/Sarajevo',
            scheduled: true,
            busy: true,
            nextRun: tasks.nextRun(Slow),
            previousRun: null
        });
        expect(tasks.nextRun(Slow)?.toISOString()).toBe('2030-12-31T23:00:00.000Z');

        host.release();
        await run;
        await tasks.dispose();
    });

    it('reports no next run while a task is paused', async () => {
        const { tasks } = await start();

        tasks.pause(Slow);
        expect(tasks.nextRun(Slow)).toBeNull();
        expect(tasks.list().find((status) => status.key === 'slow')?.nextRun).toBeNull();

        tasks.resume(Slow);
        expect(tasks.nextRun(Slow)?.toISOString()).toBe('2030-12-31T23:00:00.000Z');

        await tasks.dispose();
    });

    it('applies the plugin timezone to a task without one', async () => {
        const { tasks } = await start({ timezone: 'Asia/Tokyo' });

        expect(tasks.list().find((status) => status.key === 'Tick')?.timezone).toBe('Asia/Tokyo');
        expect(tasks.list().find((status) => status.key === 'slow')?.timezone).toBe('Europe/Sarajevo');

        await tasks.dispose();
    });

    it('throws for pause on a task without a pattern', async () => {
        const { tasks } = await boot();

        expect(() => {
            tasks.pause(Reminder);
        }).toThrow(expect.objectContaining({ code: SeedcordErrorCode.PluginTasksPatternMissing }));
        await tasks.dispose();
    });

    it('swaps a class on a save and stops it on a delete', async () => {
        const { tasks } = await start();
        const file = path.join(taskFolder, 'Tick.ts');
        const keys = (): string[] => tasks.list().map((status) => status.key);

        await tasks.onHmr({ file, type: 'update' });
        expect(keys().filter((key) => key === 'Tick')).toHaveLength(1);

        await tasks.onHmr({ file, type: 'delete' });
        expect(keys()).not.toContain('Tick');

        await tasks.dispose();
    });

    describe('at startup', () => {
        it.each([
            ['duplicate-key', SeedcordErrorCode.PluginTasksDuplicateKey],
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

            expect(tasks.list()).toEqual([expect.objectContaining({ key: 'AGood', scheduled: false, nextRun: null })]);
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
            const timezone = 'Europe/Sarajvo' as TasksOptions['timezone'] & string;

            expect(() => host.attach('tasks', Tasks, { path: taskFolder, timezone })).toThrow(
                expect.objectContaining({ code: SeedcordErrorCode.PluginOptionsRejected })
            );
        });
    });
});
