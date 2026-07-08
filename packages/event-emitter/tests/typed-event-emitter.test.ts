import { describe, it, expect, vi } from 'vitest';

import { TypedEventEmitter } from '../src/TypedEventEmitter';

interface Events {
    ping: [n: number];
    pong: [];
}

describe('TypedEventEmitter core', () => {
    it('on + emit invokes the listener with the payload tuple', () => {
        const ee = new TypedEventEmitter<Events>();
        const seen: number[] = [];
        ee.on('ping', (n) => seen.push(n));
        expect(ee.emit('ping', 7)).toBe(true);
        expect(seen).toEqual([7]);
    });

    it('emit returns false when the event has no listeners', () => {
        const ee = new TypedEventEmitter<Events>();
        expect(ee.emit('pong')).toBe(false);
    });

    it('invokes multiple listeners in registration order', () => {
        const ee = new TypedEventEmitter<Events>();
        const order: string[] = [];
        ee.on('pong', () => order.push('a'));
        ee.on('pong', () => order.push('b'));
        ee.emit('pong');
        expect(order).toEqual(['a', 'b']);
    });

    it('a throwing listener propagates and stops the remaining listeners', () => {
        const ee = new TypedEventEmitter<Events>();
        const after = vi.fn();
        ee.on('pong', () => {
            throw new Error('boom');
        });
        ee.on('pong', after);
        expect(() => ee.emit('pong')).toThrow('boom');
        expect(after).not.toHaveBeenCalled();
    });

    it('once fires only on the first emit', () => {
        const ee = new TypedEventEmitter<Events>();
        const fn = vi.fn();
        ee.once('ping', fn);
        ee.emit('ping', 1);
        ee.emit('ping', 2);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith(1);
    });

    it('off removes an on listener', () => {
        const ee = new TypedEventEmitter<Events>();
        const fn = vi.fn();
        ee.on('ping', fn);
        ee.off('ping', fn);
        ee.emit('ping', 1);
        expect(fn).not.toHaveBeenCalled();
    });

    it('off removes a once listener by its original reference before it fires', () => {
        const ee = new TypedEventEmitter<Events>();
        const fn = vi.fn();
        ee.once('ping', fn);
        ee.off('ping', fn);
        ee.emit('ping', 1);
        expect(fn).not.toHaveBeenCalled();
    });

    it('removeListener aliases off', () => {
        const ee = new TypedEventEmitter<Events>();
        const fn = vi.fn();
        ee.on('ping', fn);
        ee.removeListener('ping', fn);
        ee.emit('ping', 1);
        expect(fn).not.toHaveBeenCalled();
    });
});

describe('TypedEventEmitter emit-time mutation', () => {
    it('a listener removed during emit still runs for that emit', () => {
        const ee = new TypedEventEmitter<Events>();
        const calls: string[] = [];
        const b = (): void => {
            calls.push('b');
        };
        ee.on('pong', () => {
            calls.push('a');
            ee.off('pong', b);
        });
        ee.on('pong', b);

        ee.emit('pong');
        expect(calls).toEqual(['a', 'b']);

        calls.length = 0;
        ee.emit('pong');
        expect(calls).toEqual(['a']);
    });

    it('a listener added during emit does not run for that emit', () => {
        const ee = new TypedEventEmitter<Events>();
        const late = vi.fn();
        ee.on('pong', () => {
            ee.on('pong', late);
        });

        ee.emit('pong');
        expect(late).not.toHaveBeenCalled();

        ee.emit('pong');
        expect(late).toHaveBeenCalledTimes(1);
    });

    it('a once listener that re-emits its own event does not re-invoke itself', () => {
        const ee = new TypedEventEmitter<Events>();
        let count = 0;
        ee.once('ping', (n) => {
            count += 1;
            if (n < 3) ee.emit('ping', n + 1);
        });
        ee.emit('ping', 1);
        expect(count).toBe(1);
    });

    it('a sibling once fires once when a re-entrant emit drains it mid-snapshot', () => {
        const ee = new TypedEventEmitter<Events>();
        const b = vi.fn();
        ee.once('ping', (n) => {
            if (n === 1) ee.emit('ping', 2);
        });
        ee.once('ping', b);
        ee.emit('ping', 1);
        expect(b).toHaveBeenCalledTimes(1);
    });
});

describe('TypedEventEmitter introspection', () => {
    it('removeAllListeners clears one event or all', () => {
        const ee = new TypedEventEmitter<Events>();
        ee.on('ping', vi.fn());
        ee.on('pong', vi.fn());

        ee.removeAllListeners('ping');
        expect(ee.listenerCount('ping')).toBe(0);
        expect(ee.listenerCount('pong')).toBe(1);

        ee.removeAllListeners();
        expect(ee.listenerCount('pong')).toBe(0);
        expect(ee.eventNames()).toEqual([]);
    });

    it('listenerCount and eventNames reflect registrations', () => {
        const ee = new TypedEventEmitter<Events>();
        ee.on('ping', vi.fn());
        ee.on('ping', vi.fn());
        expect(ee.listenerCount('ping')).toBe(2);
        expect(ee.eventNames()).toContain('ping');
    });

    it('prunes the event after a lone once listener fires', () => {
        const ee = new TypedEventEmitter<Events>();
        ee.once('ping', vi.fn());
        ee.emit('ping', 1);
        expect(ee.listenerCount('ping')).toBe(0);
        expect(ee.eventNames()).toEqual([]);
    });
});
