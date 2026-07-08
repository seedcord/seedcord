/** Event map with no events, the default for an emitter that emits nothing. */
export type NoEvents = Record<never, readonly unknown[]>;

/**
 * Constrains an event map so every value is a payload tuple.
 *
 * @typeParam TEvents - Map of event names to readonly tuple payloads.
 */
export type EventMap<TEvents extends object> = { [K in keyof TEvents]: readonly unknown[] };

/** @internal */
export type EventKey<TEvents extends object> = Extract<keyof TEvents, string | symbol>;

/**
 * Options for {@link TypedEventEmitter.waitFor}.
 *
 * @typeParam TArgs - The awaited event's payload tuple.
 */
export interface WaitForOptions<TArgs extends readonly unknown[] = readonly unknown[]> {
    /** Resolves only on a payload this predicate accepts. */
    filter?: (...args: TArgs) => boolean;
    /** Rejects the wait when this signal aborts. */
    signal?: AbortSignal;
    /** Rejects the wait after this many milliseconds. */
    timeoutMs?: number;
}
