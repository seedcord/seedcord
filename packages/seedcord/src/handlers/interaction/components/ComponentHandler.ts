import 'reflect-metadata';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { decodeFor } from '@customId/CustomId';
import { ComponentDefsKey } from '@customId/routing';
import { InteractionHandler } from '@handlers/interaction/InteractionHandler';

import type { AnyCustomId } from '@customId/CustomId';
import type { DecodedParams } from '@customId/Field';
import type { HasComponentDefs } from '@customId/routing';
import type { AnySelectMenuInteraction, ButtonInteraction, ModalSubmitInteraction } from 'discord.js';
import type { Promisable } from 'type-fest';

type ComponentInteraction = ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction;

// params for a single-route handler. a multi-route handler must use match(), so its params is never.
type SingleParams<Defs extends readonly AnyCustomId[]> = Defs extends readonly [infer One extends AnyCustomId]
    ? DecodedParams<One['shape']>
    : never;

// one arm per route, keyed by prefix, each receiving that route's decoded params.
type MatchArms<Defs extends readonly AnyCustomId[], Ret> = {
    [Def in Defs[number] as Def['prefix']]: (params: DecodedParams<Def['shape']>) => Promisable<Ret>;
};

// decode once per instance, cached here. a module WeakMap, not an instance field, because
// BaseHandler.populate() runs inside super() before a subclass field would initialize under
// useDefineForClassFields.
const decodeCache = new WeakMap<object, { prefix: string; params: Record<string, unknown> }>();

/** @internal */
export abstract class ComponentHandler<Event extends ComponentInteraction, Defs extends readonly AnyCustomId[]>
    extends InteractionHandler<Event>
    implements HasComponentDefs<Defs>
{
    // phantom only, never set at runtime. a route decorator types its argument against this so passing
    // different defs to the decorator and the generic fails to compile.
    declare readonly __componentDefs?: Defs;

    // the definitions the route decorator stored, read off the concrete handler class.
    private get registeredDefs(): readonly AnyCustomId[] {
        const defs = Reflect.getMetadata(ComponentDefsKey, this.constructor) as readonly AnyCustomId[] | undefined;
        if (!defs) throw new SeedcordError(SeedcordErrorCode.CustomIdHandlerRouteMissing, [this.constructor.name]);
        return defs;
    }

    private get route(): { prefix: string; params: Record<string, unknown> } {
        const cached = decodeCache.get(this);
        if (cached) return cached;
        // justified, decodeFor returns runtime values and the generic Defs fixes their decoded types.
        const decoded = decodeFor(this.registeredDefs, this.event.customId) as {
            prefix: string;
            params: Record<string, unknown>;
        };
        decodeCache.set(this, decoded);
        return decoded;
    }

    /**
     * The decoded params of the single route this handler is registered for.
     *
     * Reading this decodes `this.event.customId` once (cached after the first read) and throws
     * `StaleCustomId` or `InvalidCustomId` when the wire no longer matches the current shape, which the
     * Catchable decorator turns into a reply. On a handler registered for several routes this is
     * `never`, so use {@link match} instead.
     */
    protected get params(): SingleParams<Defs> {
        return this.route.params as SingleParams<Defs>;
    }

    /**
     * Run the arm for whichever route the component was minted from.
     *
     * Provide one arm per registered route, keyed by its prefix, and each arm receives that route's
     * decoded params. A missing arm is a compile error. Decoding runs before any arm, so a stale or
     * corrupt wire throws before an arm body executes.
     *
     * @param arms - One handler per registered route, keyed by prefix.
     * @returns The result of the arm that ran.
     */
    protected async match<Ret>(arms: MatchArms<Defs, Ret>): Promise<Ret> {
        const { prefix, params } = this.route;
        const arm = (arms as Record<string, (params: Record<string, unknown>) => Promisable<Ret>>)[prefix];
        if (!arm) throw new SeedcordError(SeedcordErrorCode.CustomIdMatchArmMissing, [prefix]);
        return await arm(params);
    }
}
