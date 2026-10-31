// an hmr rollback re-registers this same class. a save imports a new one
export class OnceTracker {
    // weak so an unloaded class can be collected
    private readonly spent = new WeakMap<object, Set<string>>();

    public isSpent(ctor: object, key: string): boolean {
        return this.spent.get(ctor)?.has(key) ?? false;
    }

    // true for the first claim only
    public claim(ctor: object, key: string): boolean {
        const keys = this.spent.get(ctor) ?? new Set<string>();
        if (keys.has(key)) return false;
        this.spent.set(ctor, keys.add(key));
        return true;
    }
}
