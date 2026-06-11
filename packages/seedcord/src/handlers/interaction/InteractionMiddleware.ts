import { BaseHandler } from '@handlers/BaseHandler';

import type { Handler, Repliables } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';

/**
 * Base class for interaction middleware
 *
 * Middleware runs before interaction handlers and can modify behavior or block execution.
 * Unlike handlers, middleware should not send responses directly.
 *
 * @typeParam Repliable - The interaction type this middleware processes
 */
export abstract class InteractionMiddleware<Repliable extends Repliables>
    extends BaseHandler<Repliable>
    implements Handler
{
    constructor(event: Repliable, core: Core) {
        super(event, core);
    }
}
