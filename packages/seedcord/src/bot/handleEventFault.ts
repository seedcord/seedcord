import { Denial, Silence } from '@seedcord/kit';
import { Logger } from '@seedcord/services';
import { DiscordAPIError, GuildMember, Message, User } from 'discord.js';

import { extractErrorResponse } from '@miscellaneous/extractErrorResponse';

import type { Core } from '@interfaces/Core';
import type { Nullable } from '@seedcord/types';
import type { Guild } from 'discord.js';

const logger = new Logger('EventBoundary');

interface EventActor {
    guild: Nullable<Guild>;
    user: Nullable<User>;
    channelId: string | null;
}

/**
 * The event controller boundary. Reports a throw from an event handler and never replies, since a
 * generic event has no reply target. A {@link Silence} or a non-reporting {@link Denial} stops quietly, a
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
    if (!(caught instanceof Error)) throw caught;

    // empty by default, so a dead resource on an event reports (throttled) until the dev confirms it is
    // an expected dead end and adds the code here. a swallowed code still debug-logs.
    const ignore = new Set<number>(core.config.errors?.ignoreEventApiCodes ?? []);
    if (caught instanceof DiscordAPIError && typeof caught.code === 'number' && ignore.has(caught.code)) {
        logger.debug(`swallowed api code ${caught.code}`);
        return;
    }

    // a non-reporting denial has no reply target on an event, so it stops quietly
    if (caught instanceof Denial && !caught.report) return;

    const actor = deriveEventActor(args);
    extractErrorResponse(caught, core, {
        event: { name: eventName, handler: handlerName, args, channelId: actor.channelId },
        guild: actor.guild,
        user: actor.user
    });
}

// the actor sits in a different arg per event, so scan the tuple for the common carriers, best-effort
function deriveEventActor(args: unknown): EventActor {
    const tuple = Array.isArray(args) ? (args as unknown[]) : [args];
    for (const arg of tuple) {
        if (arg instanceof Message) return { guild: arg.guild, user: arg.author, channelId: arg.channelId };
        if (arg instanceof GuildMember) return { guild: arg.guild, user: arg.user, channelId: null };
        if (arg instanceof User) return { guild: null, user: arg, channelId: null };
    }
    return { guild: null, user: null, channelId: null };
}
