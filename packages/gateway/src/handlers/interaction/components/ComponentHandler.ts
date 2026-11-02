import { caseFor, ComponentDefsBrand, decodeComponentRoute } from '@seedcord/core/internal';

import { InteractionHandler } from '#handlers/interaction/InteractionHandler';

import type { SentMessage } from '#bot/ReplySender';
import type { GatewayReplyResponse } from '#interfaces/ReplyResponse';
import type { DecodedComponentRoute, HasComponentDefs, MatchCases, SingleParams } from '@seedcord/core/internal';
import type { AnyCustomId } from '@seedcord/custom-id';
import type { AnySelectMenuInteraction, ButtonInteraction, ModalSubmitInteraction } from 'discord.js';
import type { Promisable } from 'type-fest';

type ComponentInteraction = ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction;

/**
 * Shared base the customId-routed component handlers extend.
 *
 * Not a public entry point. Extend {@link ButtonHandler}, {@link ModalHandler}, or one of the select menu
 * bases instead. This class defines the customId decode and the route matching those bases share.
 *
 * @typeParam Event - The component interaction type this handler processes
 * @typeParam Defs - The customId route definitions registered on the concrete handler
 */
export abstract class ComponentHandler<Event extends ComponentInteraction, Defs extends readonly AnyCustomId[]>
    extends InteractionHandler<Event>
    implements HasComponentDefs<Defs>
{
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [ComponentDefsBrand]?: Defs;

    /** Rewrite the source message this component interaction came from. */
    protected update(response: GatewayReplyResponse | string): Promise<SentMessage> {
        return this.sender.update(response);
    }

    /** Acknowledge the component without changing the source message. */
    protected deferUpdate(): Promise<void> {
        return this.sender.deferUpdate();
    }

    private decoded?: DecodedComponentRoute;

    private get decodedRoute(): DecodedComponentRoute {
        this.decoded ??= decodeComponentRoute(this.constructor, this.event.customId);
        return this.decoded;
    }

    /** The matched custom-ID prefix, such as `approve`, without encoded params. */
    protected get route(): Defs[number]['prefix'] {
        return this.dispatch.route;
    }

    /**
     * The decoded params of the single route this handler is registered for.
     *
     * Reading this decodes `this.event.customId` once and caches the result. On a handler registered
     * for several routes this is `never`. Use {@link match} instead.
     *
     * @throws A **StaleCustomId** when the wire was encoded under an older shape. The controller boundary turns it into a reply.
     * @throws An **InvalidCustomId** when the wire is corrupt. The controller boundary turns it into a reply.
     */
    protected get params(): SingleParams<Defs> {
        return this.decodedRoute.params as SingleParams<Defs>;
    }

    /**
     * Run the case for whichever route the component was minted from. Use this only when the handler is
     * registered for several routes. On a single-route handler, read `this.params` directly. On a multi-route
     * handler `this.params` is `never`, leaving match as the only way to read the decoded params.
     *
     * Provide one case per registered route, keyed by its prefix, and each case receives that route's own
     * decoded params. The compiler checks that the cases cover every registered route prefix. `match`
     * decodes the wire before it runs a case.
     *
     * @param cases - One callback per registered route, keyed by prefix.
     * @returns The result of the case that ran.
     * @throws A **SeedcordTypeError** with `MatchCaseMissing` when the wire's prefix doesn't have a case.
     * @throws A **StaleCustomId** when the wire was encoded under an older shape.
     * @throws An **InvalidCustomId** when the wire is corrupt.
     *
     * @example
     * ```ts
     * \@ButtonRoute(Approve, Reject)
     * class ReviewButtons extends ButtonHandler<[typeof Approve, typeof Reject]> {
     *     async execute() {
     *         await this.match({
     *             approve: ({ userId }) => this.reply(`approved <@${userId}>`),
     *             reject: ({ userId }) => this.reply(`rejected <@${userId}>`)
     *         });
     *     }
     * }
     * ```
     */
    protected async match<Ret>(cases: MatchCases<Defs, Ret>): Promise<Ret> {
        const { prefix, params } = this.decodedRoute;
        // justified: the types can't tie a decoded prefix to its params
        const byPrefix = cases as Record<string, (params: Record<string, unknown>) => Promisable<Ret>>;
        return await caseFor(this, byPrefix, 'component route', prefix)(params);
    }
}
