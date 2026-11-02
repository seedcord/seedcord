import { Silence } from '@seedcord/core';
import { reportFault } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { asError } from '@seedcord/utils/internal';
import { DiscordAPIError } from 'discord.js';

import { deriveEventActor } from '#miscellaneous/deriveEventActor';
import { faultReportOf } from '#miscellaneous/faultReportOf';

import type { Core } from '#interfaces/Core';
import type { DispatchContext } from '@seedcord/core';

const logger = new Logger('Faults', { channel: 'errors' });

interface EventFault {
    readonly eventName: string;
    readonly handlerName: string;
    readonly args: unknown;
    readonly dispatch: DispatchContext;
}

// a generic event has no reply target
export function handleEventFault(caught: unknown, fault: EventFault, core: Core): void {
    const { eventName, handlerName, args, dispatch } = fault;
    if (caught instanceof Silence) {
        if (caught.reason !== undefined && (core.config.errors?.logSilences ?? true)) {
            logger.debug(`Silence: ${caught.reason}`);
        }
        return;
    }
    const error = asError(caught);

    const ignore = new Set<number | string>(core.config.errors?.ignoreEventApiCodes ?? []);
    if (error instanceof DiscordAPIError && ignore.has(error.code)) {
        logger.debug(`swallowed api code ${error.code}`);
        return;
    }

    const { channelId, guild, user } = deriveEventActor(args);
    const event = { name: eventName, handler: handlerName, args, channelId, guild, user };
    reportFault(
        core.bus,
        core.config.errors,
        error,
        faultReportOf({ kind: 'event', dispatch, event }, crypto.randomUUID())
    );
}
