'use client';

import { useSyncExternalStore } from 'react';

export class StoredItems {
    private readonly listeners = new Set<() => void>();
    // values the browser refused to store. reads still return them until the page reloads
    private readonly unsaved = new Map<string, string>();
    private readonly storage: () => Storage;

    public constructor(storage: () => Storage) {
        this.storage = storage;
    }

    // useSyncExternalStore calls subscribe without `this`. the arrow keeps it bound to the instance
    public readonly subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    public read(key: string): string | null {
        const unsaved = this.unsaved.get(key);
        if (unsaved !== undefined) return unsaved;
        try {
            return this.storage().getItem(key);
        } catch {
            // SecurityError when the browser blocks storage
            return null;
        }
    }

    public write(key: string, value: string): void {
        try {
            this.storage().setItem(key, value);
            this.unsaved.delete(key);
        } catch {
            this.unsaved.set(key, value);
        }
        for (const listener of this.listeners) listener();
    }
}

export const localItems = new StoredItems(() => globalThis.localStorage);
export const sessionItems = new StoredItems(() => globalThis.sessionStorage);

// returns null on the server and while hydrating to match the html that the server sent
export function useStoredItem(items: StoredItems, key: string | undefined): string | null {
    return useSyncExternalStore(
        items.subscribe,
        () => (key === undefined ? null : items.read(key)),
        () => null
    );
}
