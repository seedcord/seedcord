import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { CooldownManager } from '../src/CooldownManager';

describe('CooldownManager', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('throws while a key is cooling down and recovers after the window', () => {
        const cooldown = new CooldownManager({ cooldown: 1000 });

        cooldown.check('user'); // first call records the timestamp, no throw
        expect(() => cooldown.check('user')).toThrow();

        vi.advanceTimersByTime(1000);
        expect(() => cooldown.check('user')).not.toThrow();
    });

    it('throws the injected error class with the remaining ms', () => {
        class CooldownError extends Error {
            public constructor(
                message: string,
                public readonly remaining: number
            ) {
                super(message);
            }
        }

        const cooldown = new CooldownManager({ cooldown: 500, err: CooldownError, message: 'wait' });
        cooldown.check('k');

        let thrown: unknown;
        try {
            cooldown.check('k');
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(CooldownError);
        expect((thrown as CooldownError).remaining).toBeGreaterThan(0);
        expect((thrown as CooldownError).message).toBe('wait');
    });

    it('reports active status and clears keys', () => {
        const cooldown = new CooldownManager({ cooldown: 1000 });

        cooldown.set('a');
        expect(cooldown.isActive('a')).toBe(true);

        cooldown.clear('a');
        expect(cooldown.isActive('a')).toBe(false);
    });
});
