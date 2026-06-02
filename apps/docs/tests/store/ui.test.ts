import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// justified: jsdom under vitest 4 exposes window.localStorage without Storage methods; the store needs a real Storage shim installed before import.
function installStorageShim(): void {
    const data = new Map<string, string>();
    const shim: Storage = {
        get length() {
            return data.size;
        },
        clear: () => data.clear(),
        getItem: (key: string) => (data.has(key) ? (data.get(key) ?? null) : null),
        key: (index: number) => Array.from(data.keys())[index] ?? null,
        removeItem: (key: string) => {
            data.delete(key);
        },
        setItem: (key: string, value: string) => {
            data.set(key, String(value));
        }
    };
    Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: shim
    });
}

installStorageShim();

const { useUIStore } = await import('../../src/store/ui');

const initialState = useUIStore.getState();

function resetStore(): void {
    useUIStore.setState(
        {
            isCommandPaletteOpen: initialState.isCommandPaletteOpen,
            memberAccessLevel: initialState.memberAccessLevel
        },
        false
    );
}

beforeEach(() => {
    window.localStorage.clear();
    resetStore();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('useUIStore', () => {
    describe('defaults', () => {
        it('exposes documented default state when no storage entry exists', () => {
            const state = useUIStore.getState();

            expect(state.isCommandPaletteOpen).toBe(false);
            expect(state.memberAccessLevel).toBe('protected');
        });
    });

    describe('command palette', () => {
        it('toggles open state without touching localStorage', () => {
            const setItem = vi.spyOn(window.localStorage, 'setItem');

            useUIStore.getState().toggleCommandPalette();
            expect(useUIStore.getState().isCommandPaletteOpen).toBe(true);

            useUIStore.getState().toggleCommandPalette();
            expect(useUIStore.getState().isCommandPaletteOpen).toBe(false);

            expect(setItem).not.toHaveBeenCalled();
        });

        it('setCommandPaletteOpen does not write to localStorage', () => {
            const setItem = vi.spyOn(window.localStorage, 'setItem');

            useUIStore.getState().setCommandPaletteOpen(true);

            expect(setItem).not.toHaveBeenCalled();
        });
    });

    describe('member access level', () => {
        it('persists memberAccessLevel under docs.memberAccessLevel', () => {
            const setItem = vi.spyOn(window.localStorage, 'setItem');

            useUIStore.getState().setMemberAccessLevel('public');

            expect(setItem).toHaveBeenCalledWith('docs.memberAccessLevel', 'public');
            expect(window.localStorage.getItem('docs.memberAccessLevel')).toBe('public');
        });

        it('preserves unrelated fields when memberAccessLevel changes', () => {
            useUIStore.getState().setMemberAccessLevel('public');

            const snapshot = useUIStore.getState();
            expect(snapshot.memberAccessLevel).toBe('public');
            expect(snapshot.isCommandPaletteOpen).toBe(false);
        });
    });

    describe('hydration', () => {
        it('does not read from localStorage on getState; prior entries do not override defaults', async () => {
            window.localStorage.setItem('docs.memberAccessLevel', 'public');

            const getItem = vi.spyOn(window.localStorage, 'getItem');

            vi.resetModules();
            const { useUIStore: freshStore } = await import('../../src/store/ui');

            expect(freshStore.getState().memberAccessLevel).toBe('protected');
            expect(getItem).not.toHaveBeenCalled();
        });
    });
});
