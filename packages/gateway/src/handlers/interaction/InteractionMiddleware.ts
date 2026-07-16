import { BaseHandler } from '@handlers/BaseHandler';

import type { Repliables } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';

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
        super(event, core);
    }
}
