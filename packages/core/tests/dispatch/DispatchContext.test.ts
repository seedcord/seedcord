import { describe, it, expect } from 'vitest';

import { DispatchContext } from '#src/dispatch/DispatchContext';

describe('DispatchContext', () => {
    it('round-trips a value through set and get', () => {
        const ctx = new DispatchContext(null);
        // DispatchState is empty in tests, so the key type is `never`. a cast stands in for a plugin's
        // declaration merge, proving set and get compose.
        const bag = ctx as unknown as { set(k: string, v: unknown): void; get(k: string): unknown };
        bag.set('locale', 'en');
        expect(bag.get('locale')).toBe('en');
    });
});
