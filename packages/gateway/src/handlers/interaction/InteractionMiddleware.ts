import { BaseHandler } from '@src/handlers/BaseHandler';

import type { Core } from '@interfaces/Core';
import type { Repliables } from '@src/handlers/interactionTypes';

/**
 * Base class for interaction middleware
 *
 * Middleware runs before interaction handlers and can modify behavior or block execution.
 * Unlike handlers, middleware should not send responses directly.
 *
 * @typeParam Repliable - The interaction type this middleware processes
 */
export abstract class InteractionMiddleware<Repliable extends Repliables> extends BaseHandler<Repliable> {
    // keep this ctor. it gives typeof InteractionMiddleware a public construct signature that
    // InteractionMiddlewareConstructor needs, and dropping it collapses that type to never.
    constructor(event: Repliable, core: Core) {
        super(event, core, undefined, 'interactions');
    }
}
