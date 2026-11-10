import { PluginHost } from '@seedcord/core/plugin';
import { LoggerChannelRegistry } from '@seedcord/logger';

import { Tasks } from '#src/Tasks';

import type { TasksOptions } from '#src/types/Tasks';
import type { CoreBase } from '@seedcord/core';
import type { KvDriver, KvEntry, LogLevel } from '@seedcord/types';

export interface Run {
    task: string;
    trigger: string;
    data: unknown;
}

// keeps its keys across a "restart", like a real store
export class FakeDriver implements KvDriver, Disposable {
    public readonly stored = new Map<string, string>();
    public failReads = 0;
    public failDeletes = 0;
    private failHeldDeletes = false;
    private failHeldReads = false;
    private readGate: Promise<void> | undefined;
    private deleteGate: Promise<void> | undefined;
    private setGate: Promise<void> | undefined;

    // with fail, the held deletes throw once released
    public holdDeletes({ fail = false } = {}): () => void {
        const { promise, resolve } = Promise.withResolvers<undefined>();
        this.deleteGate = promise;
        this.failHeldDeletes = fail;
        return () => {
            this.deleteGate = undefined;
            resolve(undefined);
        };
    }

    public holdReads({ fail = false } = {}): () => void {
        const { promise, resolve } = Promise.withResolvers<undefined>();
        this.readGate = promise;
        this.failHeldReads = fail;
        return () => {
            this.readGate = undefined;
            resolve(undefined);
        };
    }

    public holdSets(): () => void {
        const { promise, resolve } = Promise.withResolvers<undefined>();
        this.setGate = promise;
        return () => {
            this.setGate = undefined;
            resolve(undefined);
        };
    }

    public get(key: string): Promise<string | undefined> | string | undefined {
        if (this.failReads > 0) {
            this.failReads -= 1;
            throw new Error('store is down');
        }
        if (this.readGate) {
            const fail = this.failHeldReads;
            return this.readGate.then(() => {
                if (fail) throw new Error('store is down');
                return this.stored.get(key);
            });
        }
        return this.stored.get(key);
    }

    public set(key: string, value: string): Promise<void> | undefined {
        if (this.setGate) {
            return this.setGate.then(() => {
                this.stored.set(key, value);
            });
        }
        this.stored.set(key, value);
        return undefined;
    }

    public delete(key: string): Promise<void> | undefined {
        if (this.failDeletes > 0) {
            this.failDeletes -= 1;
            throw new Error('store is down');
        }
        if (this.deleteGate) {
            const fail = this.failHeldDeletes;
            return this.deleteGate.then(() => {
                if (fail) throw new Error('store is down');
                this.stored.delete(key);
            });
        }
        this.stored.delete(key);
        return undefined;
    }

    public *entries(prefix: string): Iterable<KvEntry> {
        for (const entry of this.stored) if (entry[0].startsWith(prefix)) yield entry;
    }

    public [Symbol.dispose](): void {
        this.stored.clear();
    }
}

export class TestHost extends PluginHost<'gateway', 'server'> {
    // justified: nothing under test reads these
    public readonly config = {} as CoreBase['config'];
    public readonly rest = {} as CoreBase['rest'];
    public readonly applicationId = 'app';

    public readonly runs: Run[] = [];
    public release: () => void = () => undefined;
    public gate: Promise<void> = Promise.resolve();
    // each run takes the next gate. A test releases them in any order
    public readonly gates: Promise<void>[] = [];
    public releaseOverrun: () => void = () => undefined;
    public failOverrun = false;
    // Slow calls this once, before its first await
    public reenter: (() => Promise<void>) | undefined;
    public overrunGate: Promise<void> = Promise.resolve();

    constructor(driver: ConstructorParameters<typeof PluginHost>[2]) {
        super('gateway', 'server', driver);
    }

    public hold(): void {
        this.gate = new Promise((resolve) => {
            this.release = resolve;
        });
    }

    public holdOverrun(): void {
        this.overrunGate = new Promise((resolve) => {
            this.releaseOverrun = resolve;
        });
    }
}

type Driver = ConstructorParameters<typeof TestHost>[0];

export interface Booted extends AsyncDisposable {
    host: TestHost;
    tasks: Tasks;
}

// a bot that hasn't logged in yet
export async function boot(options: TasksOptions, driver: Driver = new FakeDriver()): Promise<Booted> {
    const host = new TestHost(driver);
    const bot = host.attach('tasks', Tasks, options);
    await bot.tasks.init();
    return { host, tasks: bot.tasks, [Symbol.asyncDispose]: () => bot.tasks.dispose() };
}

export async function start(options: TasksOptions, driver?: Driver): Promise<Booted> {
    const booted = await boot(options, driver);
    booted.tasks.ready();
    return booted;
}

export interface CapturedLogs extends Disposable {
    at(level: LogLevel): string[];
}

// mutes the console until disposed
export function captureLogs(): CapturedLogs {
    const records: { level: LogLevel; message: string }[] = [];
    const sink = LoggerChannelRegistry.instance.installSink(
        { kind: 'capture', onLog: (record) => records.push(record) },
        { muteConsole: true }
    );

    return {
        at: (level) => records.filter((record) => record.level === level).map((record) => record.message),
        [Symbol.dispose]: () => {
            sink[Symbol.dispose]();
        }
    };
}
