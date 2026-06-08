import 'reflect-metadata';

import { SeedcordErrorCode } from '@seedcord/services';
import { SeedcordError } from '@seedcord/services/internal';

import { InteractionHandler } from '@interfaces/Handler';

import { decodeFor } from './CustomId';
import { ComponentDefsKey } from './routing';

import type { AnyCustomId } from './CustomId';
import type { DecodedParams } from './Field';
import type { HasComponentDefs } from './routing';
import type { SelectMenuInteractionFor, SelectMenuType } from '@bDecorators/Interactions';
import type { AnySelectMenuInteraction, ButtonInteraction, CacheType, ModalSubmitInteraction } from 'discord.js';
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

abstract class ComponentHandler<Event extends ComponentInteraction, Defs extends readonly AnyCustomId[]>
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

/**
 * Base class for a button interaction handler.
 *
 * Register the customId definitions this handler decodes with `@ButtonRoute`, list the same ones in the
 * generic, then read `this.params` for a single route or `this.match` for several. Passing different
 * definitions to the decorator and the generic is a compile error.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof ApproveId]`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 *
 * @example
 * ```ts
 * \@ButtonRoute(ApproveId)
 * class ApproveButton extends ButtonHandler<[typeof ApproveId]> {
 *     \@Catchable()
 *     async execute() {
 *         const { userId } = this.params;
 *         await this.event.reply(`approved <@${userId}>`);
 *     }
 * }
 * ```
 */
export abstract class ButtonHandler<
    Defs extends readonly AnyCustomId[],
    Cache extends CacheType = 'cached'
> extends ComponentHandler<ButtonInteraction<Cache>, Defs> {}

/**
 * Base class for a modal submit handler.
 *
 * Register the customId definitions this handler decodes with `@ModalRoute`, list the same ones in the
 * generic, then read `this.params` for a single route or `this.match` for several. Read the submitted
 * inputs from `this.event.fields`.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof ConfigId]`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 *
 * @example
 * ```ts
 * \@ModalRoute(ConfigId)
 * class ConfigModal extends ModalHandler<[typeof ConfigId]> {
 *     \@Catchable()
 *     async execute() {
 *         const { guildId } = this.params;
 *         const name = this.event.fields.getTextInputValue('name');
 *         await this.event.reply(`saved ${name} for ${guildId}`);
 *     }
 * }
 * ```
 */
export abstract class ModalHandler<
    Defs extends readonly AnyCustomId[],
    Cache extends CacheType = 'cached'
> extends ComponentHandler<ModalSubmitInteraction<Cache>, Defs> {}

/**
 * Base class for a select menu handler.
 *
 * Pass the select kind first and the customId definitions second, the same order as `@SelectMenuRoute`,
 * so `this.event` and `this.event.values` are narrowed to that kind. Read `this.params` for a single
 * route or `this.match` for several.
 *
 * @typeParam Kind - The select kind from {@link SelectMenuType}, e.g. `SelectMenuType.User`.
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof AssignId]`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 *
 * @example
 * ```ts
 * \@SelectMenuRoute(SelectMenuType.User, AssignId)
 * class AssignSelect extends SelectHandler<SelectMenuType.User, [typeof AssignId]> {
 *     \@Catchable()
 *     async execute() {
 *         const { roleId } = this.params;
 *         await this.event.reply(`assigning ${this.event.values.length} member(s) to <@&${roleId}>`);
 *     }
 * }
 * ```
 */
export abstract class SelectHandler<
    Kind extends SelectMenuType,
    Defs extends readonly AnyCustomId[],
    Cache extends CacheType = 'cached'
> extends ComponentHandler<SelectMenuInteractionFor<Kind, Cache>, Defs> {}
