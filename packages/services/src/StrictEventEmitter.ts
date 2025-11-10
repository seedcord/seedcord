import { EventEmitter } from 'node:events';

/** Tuple type used for all event payloads. */
export type SEArgsTuple = readonly unknown[];

/** Convenience map for emitters that intentionally expose no events. */
export type SENoEvents = Record<never, SEArgsTuple>;

/**
 * Accepts any object type and constrains every value to be a tuple.
 *
 * @typeParam TEvents - Map of event names to readonly tuple payloads
 */
export type SEEventMapLike<TEvents extends object> = { [K in keyof TEvents]: SEArgsTuple };

/**
 * Narrows a provided event map to the keys that can be emitted or listened for.
 *
 * @typeParam TEvents - Map of event names to readonly tuple payloads
 * @internal
 */
export type SEEventKey<TEvents extends object> = Extract<keyof TEvents, string | symbol>;

/**
 * Typed wrapper around Node.js {@link EventEmitter} enforcing tuple payloads per event name.
 *
 * @typeParam TEvents - Map of event names to readonly tuple payloads
 */
export class StrictEventEmitter<TEvents extends SEEventMapLike<TEvents>> extends EventEmitter {
    /**
     * Registers a persistent listener with tuple-safe arguments for the given event.
     *
     * @param event - The event name to attach to
     * @param listener - Callback operating on the typed argument tuple for the event
     * @returns This emitter instance for chaining
     */
    override on<TEventKey extends SEEventKey<TEvents>>(
        event: TEventKey,
        listener: (...args: TEvents[TEventKey]) => void
    ): this {
        return super.on(event, listener as unknown as (...args: unknown[]) => void);
    }

    /**
     * Registers a one time listener that is removed after the first invocation.
     *
     * @param event - The event name to attach to
     * @param listener - Callback operating on the typed argument tuple for the event
     * @returns This emitter instance for chaining
     */
    override once<TEventKey extends SEEventKey<TEvents>>(
        event: TEventKey,
        listener: (...args: TEvents[TEventKey]) => void
    ): this {
        return super.once(event, listener as unknown as (...args: unknown[]) => void);
    }

    /**
     * Removes a previously registered listener for the given event.
     *
     * @param event - The event name whose listener should be removed
     * @param listener - Callback originally registered for the event
     * @returns This emitter instance for chaining
     */
    override off<TEventKey extends SEEventKey<TEvents>>(
        event: TEventKey,
        listener: (...args: TEvents[TEventKey]) => void
    ): this {
        return super.off(event, listener as unknown as (...args: unknown[]) => void);
    }

    /**
     * Alias of {@link StrictEventEmitter.on} for compatibility with Node.js EventEmitter APIs.
     *
     * @param event - The event name to attach to
     * @param listener - Callback operating on the typed argument tuple for the event
     * @returns This emitter instance for chaining
     */
    override addListener<TEventKey extends SEEventKey<TEvents>>(
        event: TEventKey,
        listener: (...args: TEvents[TEventKey]) => void
    ): this {
        return this.on(event, listener);
    }

    /**
     * Alias of {@link StrictEventEmitter.off} for compatibility with Node.js EventEmitter APIs.
     *
     * @param event - The event name whose listener should be removed
     * @param listener - Callback originally registered for the event
     * @returns This emitter instance for chaining
     */
    override removeListener<TEventKey extends SEEventKey<TEvents>>(
        event: TEventKey,
        listener: (...args: TEvents[TEventKey]) => void
    ): this {
        return super.removeListener(event, listener as unknown as (...args: unknown[]) => void);
    }

    /**
     * Emits an event with the strictly typed argument tuple for the event name.
     *
     * @param event - The event name to emit
     * @param args - Tuple payload for the event
     * @returns True when the event had listeners, false otherwise
     */
    override emit<TEventKey extends SEEventKey<TEvents>>(event: TEventKey, ...args: TEvents[TEventKey]): boolean {
        return super.emit(event, ...(args as unknown as unknown[]));
    }

    /**
     * Retrieves the listener list for a given event with the correct tuple signature.
     *
     * @param event - The event name to inspect
     * @returns Array of listeners registered for the event
     */
    override listeners<TEventKey extends SEEventKey<TEvents>>(
        event: TEventKey
    ): ((...args: TEvents[TEventKey]) => void)[] {
        return super.listeners(event) as ((...args: TEvents[TEventKey]) => void)[];
    }

    /**
     * Counts listeners for an event without widening the return type of {@link EventEmitter.listenerCount}.
     *
     * @param event - The event name to inspect
     * @returns The total number of listeners registered for the event
     */
    listenerCountTyped<TEventKey extends SEEventKey<TEvents>>(event: TEventKey): number {
        return super.listenerCount(event);
    }

    /**
     * Returns the list of event names known to the emitter with the mapped key type.
     *
     * @returns Array of event keys supported by the emitter
     */
    eventNamesTyped(): SEEventKey<TEvents>[] {
        return super.eventNames() as SEEventKey<TEvents>[];
    }

    /**
     * Waits for an event to be emitted, resolving with the listener arguments tuple once triggered.
     * Supports optional abort signals and timeouts for cancellation semantics.
     *
     * @param event - The event name to wait for
     * @param opts - Optional abort signal or timeout in milliseconds
     * @returns Promise resolving with the emitted argument tuple; rejects when aborted or timed out
     */
    waitFor<TEventKey extends SEEventKey<TEvents>>(
        event: TEventKey,
        opts?: { signal?: AbortSignal; timeoutMs?: number }
    ): Promise<TEvents[TEventKey]> {
        return new Promise<TEvents[TEventKey]>((resolve, reject) => {
            const onEvent = (...args: TEvents[TEventKey]): void => {
                cleanup();
                resolve(args);
            };

            const onAbort = (): void => {
                cleanup();
                reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
            };

            let timeoutId: NodeJS.Timeout | null = null;

            const cleanup = (): void => {
                this.off(event, onEvent);
                opts?.signal?.removeEventListener('abort', onAbort);
                if (timeoutId) clearTimeout(timeoutId);
            };

            this.once(event, onEvent);

            if (opts?.signal) {
                if (opts.signal.aborted) return onAbort();
                opts.signal.addEventListener('abort', onAbort, { once: true });
            }

            if (opts?.timeoutMs !== undefined) {
                timeoutId = setTimeout(() => {
                    cleanup();
                    reject(new Error('Timed out'));
                }, opts.timeoutMs);
            }
        });
    }
}
