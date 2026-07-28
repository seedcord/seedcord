import { DiscordAPIError } from '@discordjs/rest';
import { Notice } from '@seedcord/core';
import { FaultThrottle, prefixOf, PublishDefault } from '@seedcord/core/internal';
import { Logger, paint } from '@seedcord/logger';
import { ApplicationCommandType, ComponentType, InteractionType } from 'discord-api-types/v10';

import { slashRouteOf } from './slashRouteOf';

import type { ValidInteractionTypes } from '@handlers/interactionTypes';
import type { Core } from '@interfaces/Core';
import type { FaultSource, SubscriptionData } from '@seedcord/core';
import type { RenderContext } from '@seedcord/types';

type InteractionFaultSource = Extract<FaultSource, { kind: 'interaction' }>;

// lazy because the logger reads the environment, which binds after this module loads
let faultLogger: Logger | undefined;
function logger(): Logger {
    faultLogger ??= new Logger('Faults');
    return faultLogger;
}

// one throttle across both report paths, so a recurring fault reports once per window. exported so
// tests reset the shared window state.
export const faultThrottle = new FaultThrottle();

/**
 * Publishes a fault on the bus, the raw-payload equivalent of the reporting half of gateway's
 * `extractErrorResponse`. A reported {@link Notice} publishes `handledException`, everything else
 * publishes `unknownException`.
 *
 * @internal
 */
export function reportFault(
    error: Error,
    uuid: RenderContext['uuid'],
    payload: ValidInteractionTypes,
    core: Core
): void {
    const key = `${routeKeyOf(payload)}:${nameOf(error)}`;
    if (!faultThrottle.shouldReport(key)) {
        logger().debug(`throttled duplicate fault ${paint.mute(key)}`);
        return;
    }

    const source = interactionSource(payload);
    if (error instanceof Notice && source)
        core.bus[PublishDefault]('handledException', { denial: error, uuid, source });
    else core.bus[PublishDefault]('unknownException', { uuid, error, ...actors(payload), metadata: payload });

    faultThrottle.markReported(key);
}

// the stable route plus the error name, so a parameterized component collapses to one key
function routeKeyOf(payload: ValidInteractionTypes): string {
    if (payload.type === InteractionType.ApplicationCommandAutocomplete)
        return `autocomplete:${slashRouteOf(payload.data)}`;
    if (payload.type === InteractionType.ApplicationCommand) {
        return payload.data.type === ApplicationCommandType.ChatInput ? slashRouteOf(payload.data) : payload.data.name;
    }
    // || not ??, an empty prefix (a too-short routeKey) must fall back to the full wire
    return prefixOf(payload.data.custom_id) || payload.data.custom_id;
}

function nameOf(error: Error): string {
    if (error instanceof Notice) return error.name;
    if (error instanceof DiscordAPIError) return String(error.code);
    return error.constructor.name;
}

// the raw payload carries guild_id but no guild name, so the guild arm of the payload stays empty here
function actors(payload: ValidInteractionTypes): Pick<SubscriptionData<'unknownException'>, 'guild' | 'user'> {
    const user = payload.member?.user ?? payload.user;
    return { guild: undefined, user: user ? { id: user.id, username: user.username } : undefined };
}

// a null return reports through unknownException, which carries no interactionKind and no required userId
function interactionSource(payload: ValidInteractionTypes): InteractionFaultSource | null {
    // discord sends member.user in a guild and user in a dm
    const user = payload.member?.user ?? payload.user;
    if (!user) return null;

    const common = {
        kind: 'interaction',
        userId: user.id,
        guildId: payload.guild_id ?? null,
        channelId: payload.channel?.id ?? null,
        interactionId: payload.id,
        raw: payload
    } as const;

    if (payload.type === InteractionType.ApplicationCommand) {
        const isSlash = payload.data.type === ApplicationCommandType.ChatInput;
        return {
            ...common,
            interactionKind: isSlash ? 'slash' : 'context-menu',
            command: routeKeyOf(payload),
            customId: null
        };
    }
    if (payload.type === InteractionType.ModalSubmit) {
        return { ...common, interactionKind: 'modal', command: null, customId: payload.data.custom_id };
    }
    if (payload.type === InteractionType.MessageComponent) {
        const isButton = payload.data.component_type === ComponentType.Button;
        return {
            ...common,
            interactionKind: isButton ? 'button' : 'select',
            command: null,
            customId: payload.data.custom_id
        };
    }
    return null;
}
