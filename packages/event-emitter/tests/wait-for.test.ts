import { describe, it, expect, vi } from 'vitest';

import { TypedEventEmitter } from '#src/TypedEventEmitter';
import { WaitForError } from '#src/WaitForError';

interface Events {
    ping: [n: number];
}

describe('TypedEventEmitter.waitFor', () => {
    it('resolves with the payload tuple when the event fires', async () => {
        const ee = new TypedEventEmitter<Events>();
        const pending = ee.waitFor('ping');
        ee.emit('ping', 42);
        await expect(pending).resolves.toEqual([42]);
    });

    it('rejects with a timeout WaitForError after timeoutMs', async () => {
        vi.useFakeTimers();
        const ee = new TypedEventEmitter<Events>();
        const pending = ee.waitFor('ping', { timeoutMs: 50 });
        vi.advanceTimersByTime(50);
        const err = await pending.catch((e: unknown) => e);
        expect(err).toBeInstanceOf(WaitForError);
        expect(err instanceof WaitForError && err.reason).toBe('timeout');
        vi.useRealTimers();
    });

    it('rejects with an aborted WaitForError when the signal aborts', async () => {
        const ee = new TypedEventEmitter<Events>();
        const controller = new AbortController();
        const pending = ee.waitFor('ping', { signal: controller.signal });
        controller.abort();
        const err = await pending.catch((e: unknown) => e);
        expect(err).toBeInstanceOf(WaitForError);
        expect(err instanceof WaitForError && err.reason).toBe('aborted');
    });

    it('rejects immediately when the signal is already aborted', async () => {
        const ee = new TypedEventEmitter<Events>();
        const pending = ee.waitFor('ping', { signal: AbortSignal.abort() });
        await expect(pending).rejects.toBeInstanceOf(WaitForError);
    });

    it('removes its listener after resolving', async () => {
        const ee = new TypedEventEmitter<Events>();
        const pending = ee.waitFor('ping');
        ee.emit('ping', 1);
        await pending;
        expect(ee.listenerCount('ping')).toBe(0);
    });

    it('removes its listener after a timeout', async () => {
        vi.useFakeTimers();
        const ee = new TypedEventEmitter<Events>();
        const pending = ee.waitFor('ping', { timeoutMs: 10 });
        vi.advanceTimersByTime(10);
        await pending.catch(() => undefined);
        expect(ee.listenerCount('ping')).toBe(0);
        vi.useRealTimers();
    });

    it('with a filter, resolves only on the first matching payload', async () => {
        const ee = new TypedEventEmitter<Events>();
        const pending = ee.waitFor('ping', { filter: (n) => n > 5 });
        ee.emit('ping', 1);
        ee.emit('ping', 9);
        await expect(pending).resolves.toEqual([9]);
    });

    it('with a filter, keeps listening until a match', async () => {
        const ee = new TypedEventEmitter<Events>();
        const pending = ee.waitFor('ping', { filter: (n) => n === 3 });
        ee.emit('ping', 1);
        ee.emit('ping', 2);
        expect(ee.listenerCount('ping')).toBe(1);
        ee.emit('ping', 3);
        await expect(pending).resolves.toEqual([3]);
        expect(ee.listenerCount('ping')).toBe(0);
    });

    it('rejects and removes its listener when the filter throws', async () => {
        const ee = new TypedEventEmitter<Events>();
        const boom = new Error('boom');
        const pending = ee.waitFor('ping', {
            filter: () => {
                throw boom;
            }
        });
        ee.emit('ping', 1);
        await expect(pending).rejects.toBe(boom);
        expect(ee.listenerCount('ping')).toBe(0);
    });
});
