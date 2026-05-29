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

const { DEFAULT_MANIFEST_PACKAGE, DEFAULT_VERSION } = await import('../../src/lib/docs/packages');
const { useUIStore } = await import('../../src/store/ui');

const initialState = useUIStore.getState();

function resetStore(): void {
    useUIStore.setState(
        {
            isCommandPaletteOpen: initialState.isCommandPaletteOpen,
            selectedPackage: initialState.selectedPackage,
            selectedVersion: initialState.selectedVersion,
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
            expect(state.selectedPackage).toBe(DEFAULT_MANIFEST_PACKAGE);
            expect(state.selectedVersion).toBe(DEFAULT_VERSION);
            expect(state.memberAccessLevel).toBe('protected');
        });
    });

    describe('snapshot reads', () => {
        it('reflects setter mutations on subsequent getState calls', () => {
            useUIStore.getState().setCommandPaletteOpen(true);
            expect(useUIStore.getState().isCommandPaletteOpen).toBe(true);

            useUIStore.getState().setSelectedPackage('@seedcord/services');
            expect(useUIStore.getState().selectedPackage).toBe('@seedcord/services');
        });

        it('preserves unrelated fields when a single field is mutated', () => {
            useUIStore.getState().setSelectedVersion('1.2.3');

            const snapshot = useUIStore.getState();
            expect(snapshot.selectedVersion).toBe('1.2.3');
            expect(snapshot.selectedPackage).toBe(DEFAULT_MANIFEST_PACKAGE);
            expect(snapshot.memberAccessLevel).toBe('protected');
            expect(snapshot.isCommandPaletteOpen).toBe(false);
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

    describe('localStorage writes (partialize selection)', () => {
        it('persists selectedPackage under docs.selectedPackage', () => {
            const setItem = vi.spyOn(window.localStorage, 'setItem');

            useUIStore.getState().setSelectedPackage('@seedcord/plugins');

            expect(setItem).toHaveBeenCalledWith('docs.selectedPackage', '@seedcord/plugins');
            expect(window.localStorage.getItem('docs.selectedPackage')).toBe('@seedcord/plugins');
        });

        it('persists selectedVersion under docs.selectedVersion', () => {
            const setItem = vi.spyOn(window.localStorage, 'setItem');

            useUIStore.getState().setSelectedVersion('2.0.0');

            expect(setItem).toHaveBeenCalledWith('docs.selectedVersion', '2.0.0');
            expect(window.localStorage.getItem('docs.selectedVersion')).toBe('2.0.0');
        });

        it('persists memberAccessLevel under docs.memberAccessLevel', () => {
            const setItem = vi.spyOn(window.localStorage, 'setItem');

            useUIStore.getState().setMemberAccessLevel('public');

            expect(setItem).toHaveBeenCalledWith('docs.memberAccessLevel', 'public');
            expect(window.localStorage.getItem('docs.memberAccessLevel')).toBe('public');
        });

        it('only the documented keys are written; transient fields are excluded', () => {
            const setItem = vi.spyOn(window.localStorage, 'setItem');

            useUIStore.getState().setCommandPaletteOpen(true);
            useUIStore.getState().toggleCommandPalette();
            useUIStore.getState().setSelectedPackage('@seedcord/types');
            useUIStore.getState().setSelectedVersion('latest');
            useUIStore.getState().setMemberAccessLevel('public');

            const writtenKeys = setItem.mock.calls.map(([key]) => key);
            expect(writtenKeys).toEqual(['docs.selectedPackage', 'docs.selectedVersion', 'docs.memberAccessLevel']);
        });
    });

    describe('hydration', () => {
        it('does not read from localStorage on getState; prior entries do not override defaults', async () => {
            window.localStorage.setItem('docs.selectedPackage', '@seedcord/services');
            window.localStorage.setItem('docs.selectedVersion', '9.9.9');
            window.localStorage.setItem('docs.memberAccessLevel', 'public');

            const getItem = vi.spyOn(window.localStorage, 'getItem');

            vi.resetModules();
            const { useUIStore: freshStore } = await import('../../src/store/ui');

            const state = freshStore.getState();
            expect(state.selectedPackage).toBe(DEFAULT_MANIFEST_PACKAGE);
            expect(state.selectedVersion).toBe(DEFAULT_VERSION);
            expect(state.memberAccessLevel).toBe('protected');
            expect(getItem).not.toHaveBeenCalled();
        });

        it('keeps defaults when localStorage is empty', () => {
            expect(window.localStorage.length).toBe(0);

            const state = useUIStore.getState();
            expect(state.selectedPackage).toBe(DEFAULT_MANIFEST_PACKAGE);
            expect(state.selectedVersion).toBe(DEFAULT_VERSION);
            expect(state.memberAccessLevel).toBe('protected');
        });
    });
});
