import { BaseHandler } from '@handlers/BaseHandler';

import type { Handler, Repliables } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';

/**
 * Base class for Discord interaction handlers
 *
 * Extend this class to handle slash commands, buttons, modals, and select menus.
 * Use decorators like `@SlashRoute`, `@ButtonRoute`, etc. to define routing.
 *
 * @typeParam Repliable - The interaction type this handler processes
 */
export abstract class InteractionHandler<Repliable extends Repliables>
    extends BaseHandler<Repliable>
    implements Handler
{
    constructor(event: Repliable, core: Core) {
        super(event, core);
    }
}
