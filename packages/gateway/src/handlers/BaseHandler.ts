import { BaseHandler as CoreBaseHandler } from '@seedcord/core';

import type { Core } from '../interfaces';
import type { ValidEventTypes } from './interactionTypes';

/**
 * The gateway base, fixes the core base's `TCore` to the gateway {@link Core} and adds the `getEvent`
 * gate hook.
 */
export abstract class BaseHandler<ValidEvent extends ValidEventTypes> extends CoreBaseHandler<ValidEvent, Core> {
    /** @internal */
    public getEvent(): ValidEvent {
        return this.event;
    }
}
