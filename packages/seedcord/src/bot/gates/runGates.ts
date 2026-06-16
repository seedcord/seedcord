import { deriveEventActor } from '@miscellaneous/deriveEventActor';

import type { EventGateContext, Gate, GateContext, GateContextBase, InteractionGateContext } from './Gate';
import type { Repliables, ValidNonInteractionKeys } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';
import type { ClientEvents } from 'discord.js';

/** Runs each gate's check in order, so the first refusal propagates to the dispatcher boundary. */
export async function runGates(gates: readonly Gate<GateContextBase>[], ctx: GateContext): Promise<void> {
    for (const gate of gates) {
        await gate.check(ctx);
    }
}

export function interactionGateContext(interaction: Repliables, core: Core): InteractionGateContext {
    return {
        kind: 'interaction',
        interaction,
        core,
        user: interaction.user,
        guild: interaction.guild,
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
        guildId: actor.guild?.id ?? null,
        channelId: actor.channelId
    };
}
