import { GuildMember } from 'discord.js';

import { deriveEventActor } from '@miscellaneous/deriveEventActor';

import type { EventGateContext, InteractionGateContext } from './Gate';
import type { Core } from '@interfaces/Core';
import type { Repliables, ValidNonInteractionKeys } from '@src/handlers/interactionTypes';
import type { ClientEvents } from 'discord.js';

export function interactionGateContext(interaction: Repliables, core: Core): InteractionGateContext {
    const rawMember = interaction.member;
    // an uncached member's roles arrive as plain ids already, and the cached everyone role's id equals
    // the guildId
    const memberRoleIds =
        rawMember instanceof GuildMember
            ? [...rawMember.roles.cache.keys()].filter((id) => id !== interaction.guildId)
            : (rawMember?.roles ?? []);

    return {
        kind: 'interaction',
        interaction,
        core,
        user: interaction.user,
        guild: interaction.guild,
        member: rawMember instanceof GuildMember ? rawMember : null,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        memberRoleIds,
        memberPermissions: interaction.memberPermissions?.bitfield ?? null,
        // djs types appPermissions as non-null on interactions
        appPermissions: interaction.appPermissions.bitfield,
        memberGuildPermissions: rawMember instanceof GuildMember ? rawMember.permissions.bitfield : null,
        appGuildPermissions: interaction.guild?.members.me?.permissions.bitfield ?? null,
        routeId: null // runHandlerGates sets routeId from the handler metadata before the gates run
    };
}

export function eventGateContext(
    eventName: ValidNonInteractionKeys,
    args: ClientEvents[ValidNonInteractionKeys],
    core: Core
): EventGateContext {
    const actor = deriveEventActor(args);
    return {
        kind: 'event',
        core,
        eventName,
        payload: args,
        user: actor.user,
        guild: actor.guild,
        member: actor.member,
        userId: actor.user?.id ?? null,
        guildId: actor.guild?.id ?? null,
        channelId: actor.channelId,
        // the cache carries the everyone role (id equals the guild id), filtered out to match the interaction shape
        memberRoleIds: actor.member ? [...actor.member.roles.cache.keys()].filter((id) => id !== actor.guild?.id) : [],
        memberPermissions: actor.member?.permissions.bitfield ?? null,
        appPermissions: null,
        memberGuildPermissions: actor.member?.permissions.bitfield ?? null,
        appGuildPermissions: actor.guild?.members.me?.permissions.bitfield ?? null,
        routeId: null // runHandlerGates sets routeId from the handler metadata before the gates run
    };
}
