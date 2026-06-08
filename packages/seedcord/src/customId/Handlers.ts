import 'reflect-metadata';

import { InteractionHandler } from '@interfaces/Handler';

import { decodeFor } from './CustomId';

import type { AnyCustomId } from './CustomId';
import type { DecodedParams } from './Field';
import type { AnySelectMenuInteraction, ButtonInteraction, CacheType, ModalSubmitInteraction } from 'discord.js';
import type { Promisable } from 'type-fest';

// the component interactions that carry a customId.
type ComponentInteraction = ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction;

// params for a single-route handler. a multi-route handler must use match(), so its params is never.
type SingleParams<Defs extends readonly AnyCustomId[]> = Defs extends readonly [infer One extends AnyCustomId]
    ? DecodedParams<One['shape']>
    : never;

// one arm per route, keyed by prefix, each receiving that route's decoded params.
type MatchArms<Defs extends readonly AnyCustomId[], Ret> = {
    [Def in Defs[number] as Def['prefix']]: (params: DecodedParams<Def['shape']>) => Promisable<Ret>;
};

// the metadata key @CustomIdRoute uses to stash a handler's definitions on its constructor.
const CUSTOM_ID_DEFS = Symbol('seedcord:customId:defs');

// decode once per instance, cached here. a module WeakMap, not an instance field, because
// BaseHandler.populate() runs inside super() before a subclass field would initialize under
// useDefineForClassFields.
const decodeCache = new WeakMap<object, { prefix: string; params: Record<string, unknown> }>();

/**
 * Register the customId definitions a component handler decodes against.
 *
 * The base reads these lazily on the first `this.params` or `this.match` access, so this decorator
 * and the handler generic must list the same definitions.
 *
 * @param defs - The definitions this handler handles, one per route.
 *
 * @example
 * ```ts
 * \@CustomIdRoute(ApproveId, DenyId)
 * class ModerationButtons extends ButtonHandler<[typeof ApproveId, typeof DenyId]> {
 *     \@Catchable()
 *     async execute() {
 *         await this.match({
 *             approve: (p) => this.event.reply(`approved <@${p.userId}>`),
 *             deny: (p) => this.event.reply(`denied <@${p.userId}>`)
 *         });
 *     }
 * }
 * ```
 */
export function CustomIdRoute(...defs: AnyCustomId[]) {
    return function (ctor: new (...args: any[]) => unknown): void {
        Reflect.defineMetadata(CUSTOM_ID_DEFS, defs, ctor);
    };
}

abstract class ComponentHandler<
    Event extends ComponentInteraction,
    Defs extends readonly AnyCustomId[]
> extends InteractionHandler<Event> {
    // the definitions stashed by @CustomIdRoute, read off the concrete handler class.
    private get registeredDefs(): readonly AnyCustomId[] {
        const defs = Reflect.getMetadata(CUSTOM_ID_DEFS, this.constructor) as readonly AnyCustomId[] | undefined;
        if (!defs) throw new Error(`${this.constructor.name} is missing its @CustomIdRoute decorator`);
        return defs;
    }

    // decode this.event.customId the first time params or match is read, then reuse it.
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
     * `StaleCustomId` or `InvalidCustomId` when the wire no longer matches the current shape, which
     * the Catchable decorator turns into a reply. On a handler registered for several routes this is
     * `never`, use {@link match} instead.
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
        if (!arm) throw new Error(`no match arm for route ${prefix}`);
        return await arm(params);
    }
}

/**
 * Base class for a button interaction handler.
 *
 * Register the customId definitions this handler decodes with {@link CustomIdRoute}, list the same
 * ones in the generic, then read `this.params` for a single route or `this.match` for several.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof ApproveId]`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 *
 * @example
 * ```ts
 * \@CustomIdRoute(ApproveId)
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
 * Register the customId definitions this handler decodes with {@link CustomIdRoute}, list the same
 * ones in the generic, then read `this.params` for a single route or `this.match` for several. Read
 * the submitted inputs from `this.event.fields`.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof ConfigId]`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 *
 * @example
 * ```ts
 * \@CustomIdRoute(ConfigId)
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
 * Base class for a select menu handler. Covers all five select kinds.
 *
 * Register the customId definitions this handler decodes with {@link CustomIdRoute}, list the same
 * ones in the generic, then read `this.params` for a single route or `this.match` for several. Read
 * the chosen values from `this.event.values`.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof AssignId]`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 *
 * @example
 * ```ts
 * \@CustomIdRoute(AssignId)
 * class AssignSelect extends SelectHandler<[typeof AssignId]> {
 *     \@Catchable()
 *     async execute() {
 *         const { roleId } = this.params;
 *         await this.event.reply(`assigning ${this.event.values.length} member(s) to ${roleId}`);
 *     }
 * }
 * ```
 */
export abstract class SelectHandler<
    Defs extends readonly AnyCustomId[],
    Cache extends CacheType = 'cached'
> extends ComponentHandler<AnySelectMenuInteraction<Cache>, Defs> {}
