import { RepliableHandler } from '#src/handlers/RepliableHandler';

import type { ReplySender } from '#bot/ReplySender';
import type { Core } from '#interfaces/Core';
import type { InteractionOf } from './middlewareKinds';
import type { DispatchContext, DispatchResult, MiddlewareKind } from '@seedcord/core';
import type { MiddlewareKindsBrand } from '@seedcord/core/internal';
import type { Promisable } from 'type-fest';

/**
 * Base class for interaction middleware.
 *
 * Middleware runs after the dispatcher builds the handler and before the gates, over the handler's own
 * reply surface. Name the kinds in the generic and list the same ones in `{ kinds }`. Several kinds give
 * `this.event` a union. The discord.js guards narrow it. A catchall reads every repliable kind.
 *
 * @typeParam Kind - One or more {@link InteractionKind} members. Defaults to every repliable kind.
 *
 * @example
 * ```ts
 * \@RegisterInteractionMiddleware({ kinds: [InteractionKind.Button] })
 * class Audit extends InteractionMiddleware<InteractionKind.Button> {
 *     async execute() {
 *         this.logger.info(this.event.customId);
 *     }
 * }
 * ```
 */
export abstract class InteractionMiddleware<
    in out Kind extends MiddlewareKind = MiddlewareKind
> extends RepliableHandler<InteractionOf<Kind>> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [MiddlewareKindsBrand]?: Kind;

    public constructor(event: InteractionOf<Kind>, core: Core, dispatch: DispatchContext, sender: ReplySender) {
        super(event, core, dispatch, sender);
    }

    /**
     * Runs once the handler settles, newest middleware first. A refusal or a throw still reaches it,
     * since seedcord calls it on every middleware whose `execute()` started. Implement it to release
     * something this middleware took in `execute()`, such as a lock or an open span. A throw in here
     * is logged and goes no further.
     *
     * @param result - How the dispatch ended. Either failure state carries the thrown value on `caught`.
     *
     * @example
     * ```ts
     * // the base declares it. an implementation carries `override`.
     * override async after(result: DispatchResult) {
     *     this.lock.release();
     * }
     * ```
     */
    public after?(result: DispatchResult): Promisable<void>;
}
