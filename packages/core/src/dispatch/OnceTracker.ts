import type { EventFrequency } from '@seedcord/types';

interface Registered {
    readonly ctor: object;
    readonly frequency: EventFrequency;
}

// keyed by class so an hmr rollback stays spent and a save runs again
export class OnceTracker {
    // weak so an unloaded class can be collected
    private readonly spent = new WeakMap<object, Set<string>>();

    public isSpent(entry: Registered, key: string): boolean {
        return entry.frequency === 'once' && (this.spent.get(entry.ctor)?.has(key) ?? false);
    }

    public claim(entry: Registered, key: string): boolean {
        if (entry.frequency !== 'once') return true;
        const keys = this.spent.get(entry.ctor) ?? new Set<string>();
        if (keys.has(key)) return false;
        this.spent.set(entry.ctor, keys.add(key));
        return true;
    }
}
