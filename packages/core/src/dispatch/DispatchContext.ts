import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { routeIdOf } from './routeIdOf';

import type { InteractionKind } from '#src/metadataKeys';
import type { DispatchBag, DispatchState } from '@seedcord/types';

type DispatchKind = `${InteractionKind}` | 'event';

export const MemberValues = Symbol('seedcord:dispatch:member-values');

export type InteractionDispatch = DispatchContext<InteractionKind>;

/**
 * State shared by middleware, gates, and handlers during one dispatch.
 *
 * @typeParam Kind - What started this dispatch, an interaction kind or `event`.
 */
export class DispatchContext<Kind extends DispatchKind = DispatchKind> implements DispatchBag {
    // a {} here would let a key named toString or __proto__ reach Object.prototype
    private readonly state = Object.create(null) as Partial<DispatchState>;

    public readonly id = crypto.randomUUID();

    /** @internal */
    public [MemberValues]: Readonly<Record<string, unknown>> = {};

    constructor(
        /** What started this dispatch, an interaction kind or `event`. */
        public readonly kind: Kind,
        /**
         * The slash path, context menu name, custom-ID prefix, or event name that started this dispatch.
         * For a custom ID that seedcord didn't make, it can be empty or a cut-off piece of that ID.
         */
        public readonly route: string,
        /** True when this route doesn't have a registered handler. */
        public readonly fallback = false
    ) {}

    /**
     * The dispatch identifier, such as `slash:search/docs`, `button:approve`, or `event:messageCreate`.
     * Component identifiers contain the custom-ID prefix without encoded params.
     */
    public get routeId(): string {
        return routeIdOf(this.kind, this.route);
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
