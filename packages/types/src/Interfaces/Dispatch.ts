/**
 * The per-dispatch bag's keys. Any code can merge fields into it by declaration merging, the same
 * pattern as {@link SlashRegistry}. The bag stays inert until one does.
 */
export interface DispatchState {}

/**
 * The read and write surface of the per-dispatch bag. `DispatchContext` in `@seedcord/core` implements
 * it. Declared here so {@link RenderContext} can carry one without importing the concrete class.
 */
export interface DispatchBag {
    /**
     * Unique to this one dispatch, and unique again the next time the same route runs. Every bus key
     * this dispatch publishes carries it as `dispatchId`, so a store keyed on it lines up the dispatch,
     * its writes, and any fault it raised.
     */
    readonly id: string;
    /** The dispatched handler as `kind:route`, for example `slash:daily` or `button:confirm`. */
    readonly routeId: string;
    /** Write a key for the rest of this dispatch to read. */
    set<Key extends keyof DispatchState>(key: Key, value: DispatchState[Key]): void;
    /** Read a key, `undefined` when nothing set it. */
    get<Key extends keyof DispatchState>(key: Key): DispatchState[Key] | undefined;
    /**
     * Read a key that must be present, with `undefined` stripped from the result.
     *
     * @throws A **SeedcordError** when nothing set the key on this dispatch.
     */
    require<Key extends keyof DispatchState>(key: Key): Exclude<DispatchState[Key], undefined>;
}
