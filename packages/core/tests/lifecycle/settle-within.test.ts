import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, it, expect } from 'vitest';

import { settleWithin, withTimeout } from '#src/lifecycle/withTimeout';

const BOUND_MS = 500;
const SHORT_MS = 5;

const never = (): Promise<void> => new Promise<void>(() => undefined);
const after = (ms: number): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('settleWithin', () => {
    it('resolves once the work resolves', async () => {
        await expect(settleWithin(after(SHORT_MS), BOUND_MS)).resolves.toBeUndefined();
    });

    it('resolves once the bound elapses', async () => {
        await expect(settleWithin(never(), SHORT_MS)).resolves.toBeUndefined();
    });

    it('resolves when the work rejects', async () => {
        // shutdown keeps going after a step fails
        await expect(settleWithin(Promise.reject(new Error('clear failed')), BOUND_MS)).resolves.toBeUndefined();
    });

    // a wait that ends early leaves the shutdown enough deadline to run a phase
    it('waits the whole time by performance.now()', async () => {
        for (let attempt = 0; attempt < 40; attempt++) {
            const startedAt = performance.now();
            await settleWithin(never(), SHORT_MS);
            expect(performance.now() - startedAt).toBeGreaterThanOrEqual(SHORT_MS);
        }
    });
});

describe('withTimeout', () => {
    it('rejects with the timeout code once the bound elapses', async () => {
        const caught: unknown = await withTimeout('slow task', never, SHORT_MS).catch((error: unknown) => error);
        expect(isSeedcordError(caught) ? caught.code : undefined).toBe(SeedcordErrorCode.LifecycleTaskTimeout);
    });

    it('rejects with the error the work threw', async () => {
        const boom = new Error('init failed');
        await expect(withTimeout('failing task', () => Promise.reject(boom), BOUND_MS)).rejects.toBe(boom);
    });

    it('rejects when run throws before it returns a promise', async () => {
        // a plugin can write dispose() without async
        const boom = new Error('sync throw');
        const run = (): Promise<void> => {
            throw boom;
        };
        await expect(withTimeout('sync task', run, BOUND_MS)).rejects.toBe(boom);
    });
});
