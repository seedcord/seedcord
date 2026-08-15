import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { accessorStore, clearStore, guardedAccessor } from '#src/miscellaneous/guarded';

const emptyStore = (): Record<string, string> => accessorStore<string>();

function unresolved(read: () => unknown): boolean {
    try {
        read();
        return false;
    } catch (error) {
        return isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.CoreAccessorUnresolved);
    }
}

describe('guardedAccessor', () => {
    it('returns a resolved value', () => {
        const store = emptyStore();
        const accessor = guardedAccessor('Emojis', store);
        store.Confirm = 'yes';

        expect(accessor.Confirm).toBe('yes');
    });

    it('throws for an absent key', () => {
        const accessor = guardedAccessor('Emojis', emptyStore());

        expect(unresolved(() => accessor.Confirm)).toBe(true);
    });

    // a command or emoji can legitimately be named `constructor`
    it('throws for a key inherited from Object.prototype', () => {
        // a plain store, so Object.prototype is actually in the chain
        const accessor = guardedAccessor('Commands', {});

        for (const inherited of ['constructor', 'toString', 'valueOf', 'hasOwnProperty']) {
            expect(unresolved(() => accessor[inherited])).toBe(true);
        }
    });

    it('enumerates every resolved key', () => {
        const store = emptyStore();
        const accessor = guardedAccessor('Emojis', store);
        store.Confirm = 'yes';
        store.Cancel = 'no';

        expect(Object.keys(accessor).sort()).toEqual(['Cancel', 'Confirm']);
        expect(Object.values(accessor).sort()).toEqual(['no', 'yes']);
    });

    it('keeps a key named __proto__ as an ordinary entry', () => {
        const store = emptyStore();
        const accessor = guardedAccessor('Emojis', store);
        const key = '__proto__';
        store[key] = 'yes';

        expect(accessor[key]).toBe('yes');
        expect(Object.keys(accessor)).toContain(key);
    });

    it('clearStore empties the record the accessor wraps', () => {
        const store = emptyStore();
        const accessor = guardedAccessor('Emojis', store);
        store.Confirm = 'yes';

        clearStore(store);

        expect(Object.keys(accessor)).toHaveLength(0);
        expect(unresolved(() => accessor.Confirm)).toBe(true);
    });

    it('leaves the `in` operator untrapped, so a probe never throws', () => {
        const store = emptyStore();
        const accessor = guardedAccessor('Emojis', store);
        store.Confirm = 'yes';

        expect('Confirm' in accessor).toBe(true);
        expect('Cancel' in accessor).toBe(false);
    });
});
