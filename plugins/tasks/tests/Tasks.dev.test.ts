import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { setDevChannel } from '@seedcord/core/internal';
import { Envapter, Environment } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { Later } from '#tests/fixtures/dev/Later';
import { LaterLoud } from '#tests/fixtures/dev/LaterLoud';
import { Quiet } from '#tests/fixtures/dev/Quiet';
import { captureLogs, start } from '#tests/utils/host';
import { tempFolder } from '#tests/utils/tempFolder';

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
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2030-01-15T12:00:00Z'));
        startDevChannel();
    });

    afterEach(() => {
        setDevChannel(undefined);
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

        const line = logs.at('info').find((message) => message.includes('runInDev')) ?? '';

        expect(['Later', 'Muted', 'Quiet'].filter((key) => line.includes(key))).toHaveLength(3);
        expect(line).not.toMatch(/Loud/);
    });

    it('runs every task outside seedcord dev, even in development mode', async () => {
        setDevChannel(undefined);
        const environment = Envapter.environment;
        Envapter.environment = Environment.Development;
        await using booted = await start(dev);
        const { host, tasks } = booted;

        await tasks.schedule(Later, { in: '1s' });
        await vi.advanceTimersByTimeAsync(SECOND_MS);
        Envapter.environment = environment;

        expect(ranTasks(host)).toEqual(['Later', 'Loud', 'Muted', 'Quiet']);
    });

    describe('a save that changes runInDev on a scheduled task', () => {
        const source = (runInDev: boolean): string =>
            [
                "import { RegisterTask } from '#src/decorators/RegisterTask';",
                "import { Task } from '#src/Task';",
                "import type { TestHost } from '#tests/utils/host';",
                `@RegisterTask({ runInDev: ${String(runInDev)} })`,
                'export class Flip extends Task<void, TestHost> {',
                '    public async execute(): Promise<void> {',
                '        this.core.runs.push({ task: this.key, trigger: this.trigger, data: this.data });',
                '        await Promise.resolve();',
                '    }',
                '}'
            ].join('\n');

        it.each([
            { from: false, to: true, runs: 1 },
            { from: true, to: false, runs: 0 }
        ])('from $from to $to leaves $runs runs of a stored job', async ({ from, to, runs }) => {
            await using folder = await tempFolder(`run-in-dev-${String(from)}`);
            const file = path.join(folder.path, 'Flip.ts');
            await writeFile(file, source(from));
            await using booted = await start({ path: folder.path });
            const { host, tasks } = booted;
            // justified: the file above exports Flip, a task without a pattern or data like Later
            const { Flip } = (await import(file)) as { Flip: typeof Later };

            await tasks.schedule(Flip, { in: '2s' });
            await writeFile(file, source(to));
            await tasks.onHmr({ file, type: 'update' });
            await vi.advanceTimersByTimeAsync(SECOND_MS * 3);

            expect(host.runs).toHaveLength(runs);
        });
    });
});
