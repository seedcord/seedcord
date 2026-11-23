import { GuildMember } from 'discord.js';

import { deriveEventActor } from '#miscellaneous/deriveEventActor';

import type { Core } from '#interfaces/Core';
import type { EventActor } from '#miscellaneous/deriveEventActor';
import type { Repliables, ValidInteractionTypes, ValidNonInteractionKeys } from '#src/handlers/interactionTypes';
import type { EventGateContext, InteractionGateContext } from './Gate';
import type { DispatchContext, DispatchOrigin } from '@seedcord/core';
import type { InteractionRunConfig } from '@seedcord/core/internal';
import type { ClientEvents } from 'discord.js';

const NO_PERMISSIONS = 0n;

export function interactionOrigin(interaction: ValidInteractionTypes): InteractionRunConfig['origin'] {
    return {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        userLocale: interaction.locale,
        guildLocale: interaction.guildLocale
    };
}

export function interactionGateContext(
    interaction: Repliables,
    core: Core,
    dispatch: DispatchContext
): InteractionGateContext {
    const rawMember = interaction.member;
    // an uncached member's roles are already plain ids. the everyone role's id equals the guildId.
    const memberRoleIds =
        rawMember instanceof GuildMember
            ? [...rawMember.roles.cache.keys()].filter((id) => id !== interaction.guildId)
            : (rawMember?.roles ?? []);

    return {
        kind: 'interaction',
        interaction,
        core,
        dispatch,
        user: interaction.user,
        guild: interaction.guild,
        member: rawMember instanceof GuildMember ? rawMember : null,
        ...interactionOrigin(interaction),
        memberRoleIds,
        memberPermissions: interaction.memberPermissions?.bitfield ?? null,
        // djs types appPermissions as non-null on interactions
        appPermissions: interaction.appPermissions.bitfield,
        memberGuildPermissions: rawMember instanceof GuildMember ? rawMember.permissions.bitfield : null,
        // discord.js caches only guilds the bot is in
        appGuildPermissions: interaction.guild
            ? (interaction.guild.members.me?.permissions.bitfield ?? null)
            : NO_PERMISSIONS
    };
}

export function eventOrigin(actor: EventActor): DispatchOrigin {
    return {
        userId: actor.user?.id ?? null,
        guildId: actor.guild?.id ?? null,
        channelId: actor.channelId,
        userLocale: null,
        guildLocale: actor.guild?.preferredLocale ?? null
    };
}

export function eventGateContext(
    eventName: ValidNonInteractionKeys,
    args: ClientEvents[ValidNonInteractionKeys],
    core: Core,
    dispatch: DispatchContext
): EventGateContext {
    const actor = deriveEventActor(args);
    return {
        kind: 'event',
        core,
        dispatch,
        eventName,
        payload: args,
        user: actor.user,
        guild: actor.guild,
        member: actor.member,
        ...eventOrigin(actor),
        // the cache has the everyone role (id equals the guild id), filtered out to match the interaction shape
        memberRoleIds: actor.member ? [...actor.member.roles.cache.keys()].filter((id) => id !== actor.guild?.id) : [],
        memberPermissions: actor.member?.permissions.bitfield ?? null,
        memberGuildPermissions: actor.member?.permissions.bitfield ?? null,
        appGuildPermissions: actor.guild?.members.me?.permissions.bitfield ?? null
    };
}
