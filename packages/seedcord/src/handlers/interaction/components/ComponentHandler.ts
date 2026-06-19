import 'reflect-metadata';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { decodeFor, ComponentDefsKey } from '@seedcord/kit/internal';

import { InteractionHandler } from '@handlers/interaction/InteractionHandler';

import type { AnyCustomId, DecodedParams, HasComponentDefs } from '@seedcord/kit/internal';
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

/**
 * Shared base the customId-routed component handlers extend.
 *
 * Not a public entry point. You should be using {@link ButtonHandler}, {@link SelectHandler}, or
 * {@link ModalHandler} instead. This class only carries the customId decode and route-matching plumbing
 * those bases share, so DO NOT use it directly.
 *
 * @typeParam Event - The component interaction type this handler processes
 * @typeParam Defs - The customId route definitions registered on the concrete handler
 */
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

    private decoded?: { prefix: string; params: Record<string, unknown> };

    private get route(): { prefix: string; params: Record<string, unknown> } {
        if (this.decoded) return this.decoded;
        // justified, decodeFor returns runtime values and the generic Defs fixes their decoded types.
        const decoded = decodeFor(this.registeredDefs, this.event.customId) as {
            prefix: string;
            params: Record<string, unknown>;
        };
        this.decoded = decoded;
        return decoded;
    }

    /**
     * The decoded params of the single route this handler is registered for.
     *
     * Reading this decodes `this.event.customId` once (cached after the first read) and throws
     * `StaleCustomId` or `InvalidCustomId` when the wire no longer matches the current shape, which the
     * controller boundary turns into a reply. On a handler registered for several routes this is
     * `never`, so use {@link match} instead.
     */
    protected get params(): SingleParams<Defs> {
        return this.route.params as SingleParams<Defs>;
    }

    /**
     * Run the arm for whichever route the component was minted from. Use this only when the handler is
     * registered for several routes. A single-route handler reads `this.params` directly. On a multi-route
     * handler `this.params` is `never`, so match is the only way to read the decoded params.
     *
     * Provide one arm per registered route, keyed by its prefix, and each arm receives that route's own
     * decoded params. The arms must cover every registered def, a missing prefix or an unknown key is a
     * compile error. Decoding runs before any arm, so a stale or corrupt wire throws before an arm body executes.
     *
     * @param arms - One handler per registered route, keyed by prefix.
     * @returns The result of the arm that ran.
     *
     * @example
     * ```ts
     * \@ButtonRoute(Approve, Reject)
     * class ReviewButtons extends ButtonHandler<[typeof Approve, typeof Reject]> {
     *     async execute() {
     *         await this.match({
     *             approve: ({ userId }) => this.event.reply(`approved <@${userId}>`),
     *             reject: ({ userId }) => this.event.reply(`rejected <@${userId}>`)
     *         });
     *     }
     * }
     * ```
     */
    protected async match<Ret>(arms: MatchArms<Defs, Ret>): Promise<Ret> {
        const { prefix, params } = this.route;
        const arm = (arms as Record<string, (params: Record<string, unknown>) => Promisable<Ret>>)[prefix];
        if (!arm) throw new SeedcordError(SeedcordErrorCode.CustomIdMatchArmMissing, [prefix]);
        return await arm(params);
    }
}
