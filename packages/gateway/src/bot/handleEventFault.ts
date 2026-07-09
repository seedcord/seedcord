import { Notice, Silence } from '@seedcord/core';
import { Logger } from '@seedcord/logger';
import { DiscordAPIError } from 'discord.js';

import { deriveEventActor } from '@miscellaneous/deriveEventActor';
import { extractErrorResponse } from '@miscellaneous/extractErrorResponse';

import type { Core } from '@interfaces/Core';

const logger = new Logger('EventBoundary');

/**
 * The event controller boundary. Reports a throw from an event handler and never replies, since a
 * generic event has no reply target. A {@link Silence} or a non-reporting {@link Notice} stops quietly, a
 * reporting denial or a raw error publishes a fault with a best-effort actor derived from the args.
 *
 * @internal
 */
export function handleEventFault(
    caught: unknown,
    eventName: string,
    handlerName: string,
    args: unknown,
    core: Core
): void {
    if (caught instanceof Silence) {
        if (caught.reason !== undefined) logger.debug(`Silence: ${caught.reason}`);
        return;
    }
    if (!Error.isError(caught)) throw caught;

    // empty by default, so a dead resource on an event reports (throttled) until the dev confirms it is
    // an expected dead end and adds the code here. a swallowed code still debug-logs.
    const ignore = new Set<number | string>(core.config.errors?.ignoreEventApiCodes ?? []);
    if (caught instanceof DiscordAPIError && ignore.has(caught.code)) {
        logger.debug(`swallowed api code ${caught.code}`);
        return;
    }

    // a non-reporting denial has no reply target on an event, so it stops quietly
    if (caught instanceof Notice && !caught.report) return;

    const actor = deriveEventActor(args);
    extractErrorResponse(caught, core, {
        event: { name: eventName, handler: handlerName, args, channelId: actor.channelId },
        guild: actor.guild,
        user: actor.user
    });
}
