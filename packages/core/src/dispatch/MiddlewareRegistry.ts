import { interactionMiddlewareMetaOf } from '#decorators/middleware';

import type { AnyMiddlewareCtor } from '#decorators/middleware';
import type { MiddlewareKind } from '#src/metadataKeys';

/**
 * A decorated middleware reduced to what the registry orders and filters on. An absent `keys` puts the
 * middleware in every chain.
 *
 * @internal
 */
export interface MiddlewareRegistration<Key extends string> {
    readonly priority: number;
    readonly keys?: readonly Key[];
}

/**
 * Reads a transport's decorator metadata off a class. Returns `undefined` for an undecorated one.
 *
 * @internal
 */
export type MiddlewareRegistrationOf<Ctor, Key extends string> = (
    ctor: Ctor
) => MiddlewareRegistration<Key> | undefined;

/** @internal */
export function interactionMiddleware(ctor: AnyMiddlewareCtor): MiddlewareRegistration<MiddlewareKind> | undefined {
    const metadata = interactionMiddlewareMetaOf(ctor);
    if (!metadata) return undefined;
    return { priority: metadata.priority, ...(metadata.kinds && { keys: metadata.kinds }) };
}

interface Entry<Ctor, Key extends string> {
    readonly ctor: Ctor;
    readonly priority: number;
    readonly keys?: ReadonlySet<Key>;
}

/**
 * Holds the middleware a transport loaded and keeps one chain per key. An interaction keys on its kind
 * and an event on its name. Priority and the key filter behave the same on each.
 *
 * @typeParam Ctor - The transport's middleware constructor type.
 * @typeParam Key - The chain lookup key.
 *
 * @internal
 */
export class MiddlewareRegistry<Ctor extends AnyMiddlewareCtor, Key extends string = MiddlewareKind> {
    private readonly entries: Entry<Ctor, Key>[] = [];
    // an in-flight dispatch keeps walking the array chainFor gave it. never mutate one in place.
    private chains = new Map<Key, readonly Ctor[]>();

    public constructor(private readonly registrationOf: MiddlewareRegistrationOf<Ctor, Key>) {}

    /**
     * Adds a decorated middleware class and returns what it registered with. Returns `undefined` for an
     * undecorated class or one already registered.
     */
    public register(ctor: Ctor): MiddlewareRegistration<Key> | undefined {
        const registration = this.registrationOf(ctor);
        if (!registration) return undefined;

        // a double import or an hmr re-scan registers the same class twice
        if (this.entries.some((entry) => entry.ctor === ctor)) return undefined;

        this.entries.push({
            ctor,
            priority: registration.priority,
            ...(registration.keys && { keys: new Set(registration.keys) })
        });
        this.rebuild();
        return registration;
    }

    public unregister(ctor: Ctor): void {
        const index = this.entries.findIndex((entry) => entry.ctor === ctor);
        if (index === -1) return;
        this.entries.splice(index, 1);
        this.rebuild();
    }

    public chainFor(key: Key): readonly Ctor[] {
        const built = this.chains.get(key);
        if (built) return built;

        const chain = this.entries.filter((entry) => !entry.keys || entry.keys.has(key)).map((entry) => entry.ctor);
        this.chains.set(key, chain);
        return chain;
    }

    private rebuild(): void {
        // a stable sort keeps ties in registration order
        this.entries.sort((a, b) => a.priority - b.priority);
        this.chains = new Map();
    }
}
