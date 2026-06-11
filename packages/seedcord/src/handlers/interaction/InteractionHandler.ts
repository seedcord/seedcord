import { BaseHandler } from '@handlers/BaseHandler';

import type { Handler, Repliables } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';

/**
 * Shared base the typed interaction handlers extend.
 *
 * Not a public entry point, reach for {@link SlashHandler}, {@link ButtonHandler}, {@link ModalHandler},
 * or {@link SelectHandler} instead. This class only carries the repliable-event plumbing those bases share.
 *
 * @typeParam Repliable - The interaction type this handler processes
 * @internal
 */
export abstract class InteractionHandler<Repliable extends Repliables>
    extends BaseHandler<Repliable>
    implements Handler
{
    // keep this ctor. it gives typeof InteractionHandler a public construct signature that HandlerConstructor
    // needs, and dropping it (inheriting BaseHandler's protected ctor) collapses HandlerConstructor to never.
    constructor(event: Repliable, core: Core) {
        super(event, core);
    }
}
