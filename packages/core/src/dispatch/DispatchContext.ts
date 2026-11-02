import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { InteractionKind } from '#src/metadataKeys';
import type { DispatchBag, DispatchState } from '@seedcord/types';

/** State shared by middleware and handlers during one dispatch. */
export class DispatchContext implements DispatchBag {
    // a {} here would let a key named toString or __proto__ reach Object.prototype
    private readonly state = Object.create(null) as Partial<DispatchState>;

    public readonly id = crypto.randomUUID();

    /**
     * @param route - The slash path, context menu name, custom-ID prefix, or event name this dispatch is for.
     * It's empty if seedcord didn't mint the interaction's custom ID.
     * @param fallback - True when no handler registered the route.
     */
    constructor(
        public readonly kind: `${InteractionKind}` | 'event',
        public readonly route: string,
        public readonly fallback = false
    ) {}

    /**
     * The dispatch identifier, such as `slash:search/docs`, `button:approve`, or `event:messageCreate`.
     * Component identifiers contain the custom-ID prefix without encoded params.
     */
    public get routeId(): string {
        return `${this.kind}:${this.route || 'unrouted'}`;
    }

    /** The {@link routeId} of the handler's own route. It's `null` on an event and on the unhandled default. */
    public get declaredRoute(): string | null {
        return this.kind === 'event' || this.fallback ? null : this.routeId;
    }

    set<Key extends keyof DispatchState>(key: Key, value: DispatchState[Key]): void {
        this.state[key] = value;
    }

    get<Key extends keyof DispatchState>(key: Key): DispatchState[Key] | undefined {
        return this.state[key];
    }

    /**
     * Read a key that must be present, with `undefined` stripped from the result.
     *
     * @throws A **SeedcordError** when nothing set the key on this dispatch.
     */
    require<Key extends keyof DispatchState>(key: Key): Exclude<DispatchState[Key], undefined> {
        const value = this.state[key];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- an empty DispatchState types every value as undefined
        if (value === undefined) throw new SeedcordError(SeedcordErrorCode.DispatchStateMissing, [String(key)]);
        return value;
    }
}
