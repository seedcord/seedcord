import { ComponentDefsBrand, decodeComponentRoute } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { InteractionHandler } from '#handlers/interaction/InteractionHandler';

import type { SentMessage } from '#bot/ReplySender';
import type { GatewayReplyResponse } from '#interfaces/ReplyResponse';
import type { DecodedComponentRoute, HasComponentDefs, MatchArms, SingleParams } from '@seedcord/core/internal';
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

    private get route(): DecodedComponentRoute {
        this.decoded ??= decodeComponentRoute(this.constructor, this.event.customId);
        return this.decoded;
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
        return this.route.params as SingleParams<Defs>;
    }

    /**
     * Run the arm for whichever route the component was minted from. Use this only when the handler is
     * registered for several routes. A single-route handler reads `this.params` directly. On a multi-route
     * handler `this.params` is `never`, leaving match as the only way to read the decoded params.
     *
     * Provide one arm per registered route, keyed by its prefix, and each arm receives that route's own
     * decoded params. The compiler checks that the arms cover every registered route prefix. `match`
     * decodes the wire before it runs an arm.
     *
     * @param arms - One callback per registered route, keyed by prefix.
     * @returns The result of the arm that ran.
     * @throws A **SeedcordTypeError** with `MatchArmMissing` when the wire's prefix has no arm.
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
    protected async match<Ret>(arms: MatchArms<Defs, Ret>): Promise<Ret> {
        const { prefix, params } = this.route;
        // justified: MatchArms is keyed by prefix literals, so the Record cast indexes it with the runtime prefix
        const arm = Object.hasOwn(arms, prefix)
            ? (arms as Record<string, (params: Record<string, unknown>) => Promisable<Ret>>)[prefix]
            : undefined;
        if (!arm)
            throw new SeedcordTypeError(SeedcordErrorCode.MatchArmMissing, [
                this.constructor.name,
                'component route',
                prefix
            ]);
        return await arm(params);
    }
}
