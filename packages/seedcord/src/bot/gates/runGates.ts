import { GuildMember } from 'discord.js';

import { deriveEventActor } from '@miscellaneous/deriveEventActor';

import { discardCommits, runCheck, runCommits } from './effects';

import type { EventGateContext, Gate, GateContext, GateContextBase, InteractionGateContext } from './Gate';
import type { Repliables, ValidNonInteractionKeys } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';
import type { ClientEvents } from 'discord.js';

/**
 * Runs each gate's check in order, so the first refusal propagates to the dispatcher boundary. An effect
 * gate's commit runs once the whole set passes.
 */
export async function runGates(gates: readonly Gate<GateContextBase>[], ctx: GateContext): Promise<void> {
    try {
        for (const gate of gates) {
            await runCheck(gate, ctx);
        }
        await runCommits(ctx);
    } finally {
        discardCommits(ctx);
    }
}

export function interactionGateContext(interaction: Repliables, core: Core): InteractionGateContext {
    return {
        kind: 'interaction',
        interaction,
        core,
        user: interaction.user,
        guild: interaction.guild,
        member: interaction.member instanceof GuildMember ? interaction.member : null,
        guildId: interaction.guildId,
        channelId: interaction.channelId
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
        guildId: actor.guild?.id ?? null,
        channelId: actor.channelId
    };
}
