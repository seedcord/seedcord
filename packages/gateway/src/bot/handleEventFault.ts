import { FaultBoundary } from '@seedcord/core/internal';
import { DiscordAPIError } from 'discord.js';

import { deriveEventActor } from '#miscellaneous/deriveEventActor';
import { eventFaultReport } from '#miscellaneous/faultReports';

import type { Core } from '#interfaces/Core';
import type { DispatchContext } from '@seedcord/core';

interface EventFault {
    readonly eventName: string;
    readonly handlerName: string;
    readonly args: unknown;
    readonly dispatch: DispatchContext;
}

// a generic event has no reply target
export function handleEventFault(caught: unknown, fault: EventFault, core: Core): void {
    const { eventName, handlerName, args, dispatch } = fault;
    const boundary = new FaultBoundary(core, core.config.errors?.ignoreEventApiCodes, DiscordAPIError);
    boundary.report(caught, (uuid) => {
        const { channelId, guild, user } = deriveEventActor(args);
        return eventFaultReport(
            { name: eventName, handler: handlerName, args, channelId, guild, user },
            dispatch,
            uuid
        );
    });
}
