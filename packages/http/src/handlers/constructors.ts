import type { InteractionMiddleware } from '#handlers/interaction/InteractionMiddleware';
import type { Payloads } from '#handlers/interaction/middlewareKinds';
import type { Core } from '#interfaces/Core';
import type { ReplySender } from '#reply/ReplySender';
import type { BaseHandler, DispatchContext, InteractionKind, MiddlewareKind } from '@seedcord/core';
import type { AutocompleteResponder, MiddlewareKindsBrand, ResolvedRoute } from '@seedcord/core/internal';
import type { TypedConstructor } from '@seedcord/types';
import type { APIApplicationCommandOptionChoice } from 'discord-api-types/v10';
import type { ValueOf } from 'type-fest';

// InteractionMiddleware reaches BaseHandler through RepliableHandler. the brand excludes it.
type AnyHandler = BaseHandler<unknown, Core> & { readonly [MiddlewareKindsBrand]?: undefined };

type ReplyTargets = Record<MiddlewareKind, ReplySender> &
    Record<InteractionKind.Autocomplete, AutocompleteResponder<APIApplicationCommandOptionChoice>>;

/** @internal The handler class each kind routes to, constructed with that kind's payload. */
export type HandlerSlots = {
    readonly [Kind in InteractionKind]: new (
        event: Payloads[Kind],
        core: Core,
        dispatch: DispatchContext,
        replyWith: ReplyTargets[Kind]
    ) => AnyHandler;
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
export type InteractionMiddlewareConstructor = TypedConstructor<typeof InteractionMiddleware>;
