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

    it('routes a rejected async listener to onListenerError', async () => {
        const ee = new SafeEmitter();
        const boom = new Error('boom');
        const after = vi.fn();

        // eslint-disable-next-line @typescript-eslint/no-misused-promises -- the void position is exactly what this pins
        ee.on('e', async () => {
            await Promise.resolve();
            throw boom;
        });
        ee.on('e', after);

        expect(ee.fire(1)).toBe(true);
        expect(after).toHaveBeenCalledWith(1);
        await vi.waitFor(() => {
            expect(ee.errors).toEqual([boom]);
        });
    });

    it('routes a rejected async once() listener to onListenerError', async () => {
        const ee = new SafeEmitter();
        const boom = new Error('boom');

        // eslint-disable-next-line @typescript-eslint/no-misused-promises -- the void position is exactly what this pins
        ee.once('e', async () => {
            await Promise.resolve();
            throw boom;
        });

        expect(ee.fire(1)).toBe(true);
        await vi.waitFor(() => {
            expect(ee.errors).toEqual([boom]);
        });
    });

    it('routes a rejected thenable that is not a native promise', async () => {
        const ee = new SafeEmitter();
        const boom = new Error('boom');

        // eslint-disable-next-line @typescript-eslint/no-misused-promises -- a listener returning a thenable is the case under test
        ee.on('e', () => ({
            // eslint-disable-next-line unicorn/no-thenable -- this object is the foreign thenable
            then: (_resolve: (value: unknown) => void, reject: (error: unknown) => void): void => {
                reject(boom);
            }
        }));

        expect(ee.fire(1)).toBe(true);
        await vi.waitFor(() => {
            expect(ee.errors).toEqual([boom]);
        });
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
