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

    public delete(key: string): void {
        if (this.failDeletes > 0) {
            this.failDeletes -= 1;
            throw new Error('store is down');
        }
        this.stored.delete(key);
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

    constructor(driver: ConstructorParameters<typeof PluginHost>[2]) {
        super('gateway', 'server', driver);
    }

    public hold(): void {
        this.gate = new Promise((resolve) => {
            this.release = resolve;
        });
    }
}
