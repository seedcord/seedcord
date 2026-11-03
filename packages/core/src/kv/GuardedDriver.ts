import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { SeedcordErrorArguments } from '@seedcord/errors/internal';
import type { KvDriver, KvEntry } from '@seedcord/types';
import type { Promisable } from 'type-fest';

type Operation = SeedcordErrorArguments<SeedcordErrorCode.CoreKvDriverFailed>[0];

function translated(operation: Operation, key: string, error: unknown): unknown {
    if (isSeedcordError(error)) return error;
    return new SeedcordError(SeedcordErrorCode.CoreKvDriverFailed, [operation, key], { cause: error });
}

async function guard<TResult>(operation: Operation, key: string, run: () => Promisable<TResult>): Promise<TResult> {
    try {
        return await run();
    } catch (error) {
        throw translated(operation, key, error);
    }
}

export class GuardedDriver implements KvDriver {
    constructor(private readonly driver: KvDriver) {}

    public async get(key: string): Promise<string | undefined> {
        return guard('read', key, () => this.driver.get(key));
    }

    public async set(key: string, value: string, ttlMs?: number): Promise<void> {
        await guard('write', key, () => this.driver.set(key, value, ttlMs));
    }

    public async delete(key: string): Promise<void> {
        await guard('delete', key, () => this.driver.delete(key));
    }

    public async *entries(prefix: string): AsyncIterable<KvEntry> {
        try {
            for await (const entry of this.driver.entries(prefix)) yield entry;
        } catch (error) {
            throw translated('list', prefix, error);
        }
    }
}
