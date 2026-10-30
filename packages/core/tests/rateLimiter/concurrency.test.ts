import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Kv } from '#src/kv/Kv';
import { MemoryDriver } from '#src/kv/MemoryDriver';
import { KvRateLimiter } from '#src/rateLimiter/KvRateLimiter';
import { memoryRateLimiter } from '#tests/utils/memoryRateLimiter';

import type { KvDriver, KvEntry } from '@seedcord/types';

interface HeldWrite {
    readonly started: Promise<undefined>;
    release(): void;
}

// holds one write open so later charges on the key queue behind it
class GatedDriver implements KvDriver, Disposable {
    private readonly memory = new MemoryDriver();
    private gate: { readonly started: () => void; readonly released: Promise<undefined> } | undefined;

    public holdNextWrite(): HeldWrite {
        const started = Promise.withResolvers<undefined>();
        const released = Promise.withResolvers<undefined>();
        this.gate = { started: () => started.resolve(undefined), released: released.promise };
        return { started: started.promise, release: () => released.resolve(undefined) };
    }

    public get(key: string): string | undefined {
        return this.memory.get(key);
    }

    public async set(key: string, value: string, ttlMs?: number): Promise<void> {
        const gate = this.gate;
        this.gate = undefined;
        if (gate) {
            gate.started();
            await gate.released;
        }
        this.memory.set(key, value, ttlMs);
    }

    public delete(key: string): void {
        this.memory.delete(key);
    }

    public entries(prefix: string): Iterable<KvEntry> {
        return this.memory.entries(prefix);
    }

    public [Symbol.dispose](): void {
        this.memory[Symbol.dispose]();
    }
}

describe('KvRateLimiter concurrent charges', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('admits exactly limit charges when many requests arrive in one frozen tick', async () => {
        const limiter = memoryRateLimiter();
        const window = { windowMs: 1000, limit: 3 };

        const results = await Promise.all(Array.from({ length: 5 }, () => limiter.charge('user', window)));

        const open = results.filter((r) => !r.limited);
        const limited = results.filter((r) => r.limited);
        expect(open).toHaveLength(3);
        expect(limited).toHaveLength(2);
    });

    it('stops counting a use that expires while a charge waits in the queue', async () => {
        const driver = new GatedDriver();
        const limiter = new KvRateLimiter(new Kv(driver));
        await limiter.charge('user', { windowMs: 1000, limit: 2 });

        const held = driver.holdNextWrite();
        const long = { windowMs: 10_000, limit: 2 };
        const first = limiter.charge('user', long);
        const second = limiter.charge('user', long);
        await held.started;
        vi.advanceTimersByTime(1000);
        held.release();

        await expect(first).resolves.toMatchObject({ limited: false });
        await expect(second).resolves.toMatchObject({ limited: false });
    });
});
