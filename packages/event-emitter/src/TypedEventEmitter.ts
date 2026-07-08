import { WaitForError } from './WaitForError';

import type { EventKey, EventMap, WaitForOptions } from './types';

type BroadListener = (...args: readonly unknown[]) => void;

interface Registration {
    readonly call: BroadListener;
    // off() matches by original, so off(userListener) removes a once registration whose call is the wrapper
    readonly original: BroadListener;
}

/**
 * Typed, cross-runtime event emitter with per-event tuple payloads.
 *
 * @typeParam TEvents - Map of event names to readonly tuple payloads.
 */
export class TypedEventEmitter<TEvents extends EventMap<TEvents>> {
    private readonly registrations = new Map<EventKey<TEvents>, Set<Registration>>();

    /** Registers a persistent listener for an event. */
    public on<TEventKey extends EventKey<TEvents>>(
        event: TEventKey,
        listener: (...args: TEvents[TEventKey]) => void
    ): this {
        // justified: the public per-event tuple erases to the common callable stored internally.
        const original = listener as BroadListener;
        this.slot(event).add({ call: original, original });
        return this;
    }

    /** Registers a listener removed after its first invocation. */
    public once<TEventKey extends EventKey<TEvents>>(
        event: TEventKey,
        listener: (...args: TEvents[TEventKey]) => void
    ): this {
        // justified: same erase as on().
        const original = listener as BroadListener;
        const registration: Registration = {
            call: (...args) => {
                this.removeRegistration(event, registration);
                original(...args);
            },
            original
        };
        this.slot(event).add(registration);
        return this;
    }

    /** Removes a previously registered listener. */
    public off<TEventKey extends EventKey<TEvents>>(
        event: TEventKey,
        listener: (...args: TEvents[TEventKey]) => void
    ): this {
        // justified: same erase as on().
        this.drop(event, listener as BroadListener);
        return this;
    }

    /** Alias of {@link TypedEventEmitter.off}. */
    public removeListener<TEventKey extends EventKey<TEvents>>(
        event: TEventKey,
        listener: (...args: TEvents[TEventKey]) => void
    ): this {
        return this.off(event, listener);
    }

    /** Emits an event, invoking each listener with the payload tuple. Returns true when the event had listeners. */
    public emit<TEventKey extends EventKey<TEvents>>(event: TEventKey, ...args: TEvents[TEventKey]): boolean {
        return this.dispatch(event, args);
    }

    /**
     * Emits a dynamically-computed event key past the compile-time key check, for framework subclasses.
     *
     * @internal
     */
    protected emitRaw(event: string | symbol, ...args: readonly unknown[]): boolean {
        return this.dispatch(event as EventKey<TEvents>, args);
    }

    private dispatch(event: EventKey<TEvents>, args: readonly unknown[]): boolean {
        const slot = this.registrations.get(event);
        if (!slot || slot.size === 0) return false;
        // snapshot so a listener that adds or removes mid-dispatch does not change this emit
        const current = [...slot];
        for (const registration of current) {
            registration.call(...args);
        }
        return true;
    }

    /** Removes every listener for an event, or for all events when no event is given. */
    public removeAllListeners(event?: EventKey<TEvents>): this {
        if (event === undefined) this.registrations.clear();
        else this.registrations.delete(event);
        return this;
    }

    /** Counts the listeners registered for an event. */
    public listenerCount<TEventKey extends EventKey<TEvents>>(event: TEventKey): number {
        return this.registrations.get(event)?.size ?? 0;
    }

    /** Returns the event names with at least one listener. */
    public eventNames(): EventKey<TEvents>[] {
        return [...this.registrations.keys()];
    }

    /**
     * Waits for the next emission of an event, resolving with its payload tuple.
     * With a filter, resolves on the first payload the filter accepts.
     *
     * @param event - The event to wait for.
     * @param options - An optional filter, abort signal, and timeout.
     * @returns A promise for the matching payload. Rejects with a {@link WaitForError} when aborted or timed out.
     * @example
     * ```ts
     * const ee = new TypedEventEmitter<{ ping: [n: number] }>();
     * const pending = ee.waitFor('ping', { filter: n => n > 0, timeoutMs: 1000 });
     * ee.emit('ping', -1); // ignored by filter
     * ee.emit('ping', 42); // resolves pending with [42]
     * ```
     */
    public waitFor<TEventKey extends EventKey<TEvents>>(
        event: TEventKey,
        options?: WaitForOptions<TEvents[TEventKey]>
    ): Promise<TEvents[TEventKey]> {
        return new Promise<TEvents[TEventKey]>((resolve, reject) => {
            const onEvent = (...args: TEvents[TEventKey]): void => {
                if (options?.filter) {
                    let matched: boolean;
                    try {
                        matched = options.filter(...args);
                    } catch (error) {
                        cleanup();
                        reject(Error.isError(error) ? error : new Error(String(error)));
                        return;
                    }
                    if (!matched) return;
                }
                cleanup();
                resolve(args);
            };

            const onAbort = (): void => {
                cleanup();
                reject(new WaitForError('aborted'));
            };

            let timer: ReturnType<typeof setTimeout> | undefined;

            const cleanup = (): void => {
                this.off(event, onEvent);
                options?.signal?.removeEventListener('abort', onAbort);
                if (timer !== undefined) clearTimeout(timer);
            };

            this.on(event, onEvent);

            if (options?.signal) {
                if (options.signal.aborted) {
                    onAbort();
                    return;
                }
                options.signal.addEventListener('abort', onAbort, { once: true });
            }

            if (options?.timeoutMs !== undefined) {
                const timeoutMs = options.timeoutMs;
                timer = setTimeout(() => {
                    cleanup();
                    reject(new WaitForError('timeout', timeoutMs));
                }, timeoutMs);
            }
        });
    }

    private slot(event: EventKey<TEvents>): Set<Registration> {
        let slot = this.registrations.get(event);
        if (!slot) {
            slot = new Set();
            this.registrations.set(event, slot);
        }
        return slot;
    }

    private drop(event: EventKey<TEvents>, original: BroadListener): void {
        const slot = this.registrations.get(event);
        if (!slot) return;
        for (const registration of slot) {
            if (registration.original === original) {
                this.removeRegistration(event, registration);
                break;
            }
        }
    }

    // deletes the empty slot so eventNames() excludes the event and dead keys do not accumulate
    private removeRegistration(event: EventKey<TEvents>, registration: Registration): void {
        const slot = this.registrations.get(event);
        if (!slot) return;
        slot.delete(registration);
        if (slot.size === 0) this.registrations.delete(event);
    }
}
