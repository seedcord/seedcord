import { Fault } from '#stops/Fault';
import { Notice } from '#stops/Notice';

import type { DispatchContext } from '#src/dispatch/DispatchContext';
import type { Config, RenderContext, ReplyResponse } from '@seedcord/types';

/** @internal */
export function faultResponse(
    error: Error,
    uuid: RenderContext['uuid'],
    dispatch: DispatchContext,
    config: Pick<Config, 'errors' | 'notifications'>
): ReplyResponse {
    const developerUsername = config.notifications?.developerUsername;
    const ctx: RenderContext =
        developerUsername === undefined ? { uuid, dispatch } : { uuid, developerUsername, dispatch };
    if (error instanceof Notice) return error.render(ctx);
    const Override = config.errors?.defaultError;
    return (Override ? new Override(uuid) : new Fault()).render(ctx);
}
