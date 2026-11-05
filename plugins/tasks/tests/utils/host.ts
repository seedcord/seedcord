import { PluginHost } from '@seedcord/core/plugin';

import type { CoreBase } from '@seedcord/core';
import type { KvDriver, KvEntry } from '@seedcord/types';

export interface Run {
    task: string;
    trigger: string;
    data: unknown;
}

/** Keeps its keys when a "restart" builds a new host, the way a real driver would. */
export class FakeDriver implements KvDriver, Disposable {
    public readonly stored = new Map<string, string>();
    public failReads = 0;
    public failDeletes = 0;
    private deleteGate: Promise<void> | undefined;

    /** Holds every delete until the returned function runs, like a slow backend. */
    public holdDeletes(): () => void {
        let release = (): void => undefined;
        this.deleteGate = new Promise((resolve) => {
            release = () => {
                this.deleteGate = undefined;
                resolve();
            };
        });
        return release;
    }

    public get(key: string): string | undefined {
        if (this.failReads > 0) {
            this.failReads -= 1;
            throw new Error('store is down');
        }
        return this.stored.get(key);
    }

    public set(key: string, value: string): void {
        this.stored.set(key, value);
    }

    public delete(key: string): Promise<void> | undefined {
        if (this.failDeletes > 0) {
            this.failDeletes -= 1;
            throw new Error('store is down');
        }
        if (this.deleteGate) {
            return this.deleteGate.then(() => {
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
    public releaseOverrun: () => void = () => undefined;
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
