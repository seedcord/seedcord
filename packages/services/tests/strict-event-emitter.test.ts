import { describe, it, expect } from 'vitest';

import { SeedcordErrorCode, isSeedcordError } from '../src/Errors';
import { StrictEventEmitter } from '../src/StrictEventEmitter';

interface PingEvents {
    ping: readonly [value: number];
}

describe('StrictEventEmitter.waitFor', () => {
    it('resolves with the emitted tuple', async () => {
        const emitter = new StrictEventEmitter<PingEvents>();
        const pending = emitter.waitFor('ping');
        emitter.emit('ping', 42);
        await expect(pending).resolves.toEqual([42]);
    });

    it('rejects with EventEmitterWaitForTimeout once the timeout elapses', async () => {
        const emitter = new StrictEventEmitter<PingEvents>();
        const error = await emitter.waitFor('ping', { timeoutMs: 5 }).catch((e: unknown) => e);
        expect(isSeedcordError(error, undefined, SeedcordErrorCode.EventEmitterWaitForTimeout)).toBe(true);
    });

    it('rejects with EventEmitterWaitForAborted when the signal aborts', async () => {
        const emitter = new StrictEventEmitter<PingEvents>();
        const controller = new AbortController();
        const pending = emitter.waitFor('ping', { signal: controller.signal });
        controller.abort();
        const error = await pending.catch((e: unknown) => e);
        expect(isSeedcordError(error, undefined, SeedcordErrorCode.EventEmitterWaitForAborted)).toBe(true);
    });

    it('rejects when the signal is already aborted on entry', async () => {
        const emitter = new StrictEventEmitter<PingEvents>();
        const error = await emitter.waitFor('ping', { signal: AbortSignal.abort() }).catch((e: unknown) => e);
        expect(isSeedcordError(error, undefined, SeedcordErrorCode.EventEmitterWaitForAborted)).toBe(true);
    });

    it('removes its listener after resolving so it does not leak', async () => {
        const emitter = new StrictEventEmitter<PingEvents>();
        const pending = emitter.waitFor('ping');
        emitter.emit('ping', 1);
        await pending;
        expect(emitter.listenerCountTyped('ping')).toBe(0);
    });
});
