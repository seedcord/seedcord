import 'reflect-metadata';

import { decodeFor, ComponentDefsKey } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { InteractionHandler } from '@handlers/interaction/InteractionHandler';

import type { SentMessage } from '@bot/ReplySender';
import type { AnyCustomId, HasComponentDefs, MatchArms, SingleParams } from '@seedcord/core/internal';
import type { ReplyResponse } from '@seedcord/types';
import type { AnySelectMenuInteraction, ButtonInteraction, ModalSubmitInteraction } from 'discord.js';
import type { Promisable } from 'type-fest';

type ComponentInteraction = ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction;

interface DecodedRoute {
    prefix: string;
    params: Record<string, unknown>;
}

/**
 * Shared base the customId-routed component handlers extend.
 *
 * Not a public entry point. Extend {@link ButtonHandler}, {@link SelectMenuHandler}, or {@link ModalHandler}
 * instead. This class defines the customId decode and the route matching those bases share.
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
    declare readonly __componentDefs?: Defs;

    /** Rewrite the source message this component interaction came from. */
    protected update(response: ReplyResponse | string): Promise<SentMessage> {
        return this.sender.update(response);
    }

    /** Acknowledge the component without changing the source message. */
    protected deferUpdate(): Promise<void> {
        return this.sender.deferUpdate();
    }

    // metadata attaches to the class
    private get registeredDefs(): readonly AnyCustomId[] {
        const defs = Reflect.getMetadata(ComponentDefsKey, this.constructor) as readonly AnyCustomId[] | undefined;
        if (!defs) throw new SeedcordError(SeedcordErrorCode.CustomIdHandlerRouteMissing, [this.constructor.name]);
        return defs;
    }

    private decoded?: DecodedRoute;

    private get route(): DecodedRoute {
        if (this.decoded) return this.decoded;
        // justified, decodeFor returns runtime values and the generic Defs fixes their decoded types.
        const decoded = decodeFor(this.registeredDefs, this.event.customId) as DecodedRoute;
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
     * decoded params. The arms cover every registered route prefix, checked at compile time, and a prefix
     * unmatched at runtime throws `CustomIdMatchArmMissing`. Decoding runs before any arm, so a stale or
     * corrupt wire throws before an arm body executes.
     *
     * @param arms - One callback per registered route, keyed by prefix.
     * @returns The result of the arm that ran.
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
        // justified: MatchArms is keyed by prefix literals, the Record cast indexes it with the runtime prefix.
        const arm = Object.hasOwn(arms, prefix)
            ? (arms as Record<string, (params: Record<string, unknown>) => Promisable<Ret>>)[prefix]
            : undefined;
        if (!arm) throw new SeedcordError(SeedcordErrorCode.CustomIdMatchArmMissing, [prefix]);
        return await arm(params);
    }
}
