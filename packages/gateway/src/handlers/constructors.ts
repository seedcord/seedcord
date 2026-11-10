import type { ReplySender } from '#bot/ReplySender';
import type { BaseHandler } from '#handlers/BaseHandler';
import type { EventHandler } from '#handlers/event/EventHandler';
import type { EventMiddleware } from '#handlers/event/EventMiddleware';
import type { InteractionMiddleware } from '#handlers/interaction/InteractionMiddleware';
import type { Payloads } from '#handlers/interaction/middlewareKinds';
import type { ValidInteractionTypes, ValidNonInteractionKeys } from '#handlers/interactionTypes';
import type { Core } from '#interfaces/Core';
import type { DispatchContext, InteractionKind, MiddlewareKind } from '@seedcord/core';
import type { AutocompleteResponder, ResolvedRoute } from '@seedcord/core/internal';
import type { TypedConstructor } from '@seedcord/types';
import type { ApplicationCommandOptionChoiceData, ClientEvents } from 'discord.js';
import type { Constructor, ValueOf } from 'type-fest';

type ReplyTargets = Record<MiddlewareKind, ReplySender> &
    Record<InteractionKind.Autocomplete, AutocompleteResponder<ApplicationCommandOptionChoiceData>>;

/** @internal The handler class each kind routes to, constructed with that kind's interaction. */
export type HandlerSlots = {
    readonly [Kind in InteractionKind]: new (
        event: Payloads[Kind],
        core: Core,
        dispatch: DispatchContext,
        replyWith: ReplyTargets[Kind]
    ) => BaseHandler<ValidInteractionTypes>;
};

/** @internal */
export type HandlerConstructor = ValueOf<HandlerSlots>;

/** @internal */
export type ResolvedInteraction<Kind extends InteractionKind = InteractionKind> = ResolvedRoute<
    HandlerSlots,
    Payloads,
    Kind
>;

/** @internal */
export type EventHandlerConstructor = Constructor<BaseHandler<ClientEvents[ValidNonInteractionKeys]>, never[]>;

/** @internal The event base with its own signature, for the site that constructs one. */
export type ConstructableEventHandler = TypedConstructor<typeof EventHandler>;

/** @internal */
export type InteractionMiddlewareConstructor = TypedConstructor<typeof InteractionMiddleware>;

/** @internal */
export type EventMiddlewareConstructor = TypedConstructor<typeof EventMiddleware>;
