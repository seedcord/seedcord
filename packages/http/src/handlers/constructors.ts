import type { InteractionMiddleware } from '#handlers/interaction/InteractionMiddleware';
import type { Core } from '#interfaces/Core';
import type { BaseHandler } from '@seedcord/core';
import type { MiddlewareKindsBrand } from '@seedcord/core/internal';
import type { TypedConstructor } from '@seedcord/types';
import type { Constructor } from 'type-fest';

// InteractionMiddleware reaches BaseHandler through RepliableHandler. the brand excludes it.
type AnyHandler = BaseHandler<unknown, Core> & { readonly [MiddlewareKindsBrand]?: undefined };

/** @internal Typed parameters would exclude every handler that narrows `event`. */
export type HandlerConstructor = Constructor<AnyHandler, never[]>;

/** @internal */
export type InteractionMiddlewareConstructor = TypedConstructor<typeof InteractionMiddleware>;
