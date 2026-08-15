import { describe, it, expect, vi } from 'vitest';

import { TypedEventEmitter } from '#src/TypedEventEmitter';

class SafeEmitter extends TypedEventEmitter<{ e: [n: number] }> {
    public readonly errors: unknown[] = [];

    public fire(n: number): boolean {
        return this.emitSafe('e', n);
    }

    protected override onListenerError(error: unknown): void {
        this.errors.push(error);
    }
}

class DefaultSafeEmitter extends TypedEventEmitter<{ e: [n: number] }> {
    public fire(n: number): boolean {
        return this.emitSafe('e', n);
    }
}

describe('TypedEventEmitter.emitSafe', () => {
    it('runs the remaining listeners and routes the error when one throws', () => {
        const ee = new SafeEmitter();
        const boom = new Error('boom');
        const after = vi.fn();
        ee.on('e', () => {
            throw boom;
        });
        ee.on('e', after);
        expect(ee.fire(1)).toBe(true);
        expect(after).toHaveBeenCalledWith(1);
        expect(ee.errors).toEqual([boom]);
    });

    it('default onListenerError isolates the caller and re-throws the error on a microtask', () => {
        const scheduled: (() => void)[] = [];
        const spy = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((cb) => {
            scheduled.push(cb);
        });

        try {
            const ee = new DefaultSafeEmitter();
            ee.on('e', () => {
                throw new Error('boom');
            });

            expect(() => ee.fire(1)).not.toThrow();
            expect(scheduled).toHaveLength(1);
            expect(() => scheduled[0]?.()).toThrow('boom');
        } finally {
            spy.mockRestore();
        }
    });
});
