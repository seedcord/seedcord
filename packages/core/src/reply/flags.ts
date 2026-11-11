import { MessageFlags } from 'discord-api-types/v10';

import type { DeferOpts, InteractionsConfig, SendOpts } from '@seedcord/types';
import type { Except } from 'type-fest';

// the sender fills ephemeral from the bot's default before a writer sees these
export type ResolvedSendOpts = Except<SendOpts, 'ephemeral'> & { readonly ephemeral: boolean };

export type ResolvedDeferOpts = Except<DeferOpts, 'ephemeral'> & { readonly ephemeral: boolean };

// a bot without a handlers path never builds a sender
export function ephemeralDefault(interactions: InteractionsConfig): boolean {
    return interactions.path === null ? true : (interactions.ephemeral ?? true);
}

// IsComponentsV2 is unconditional, since every framework reply is v2
export function sendFlags(opts: ResolvedSendOpts): number {
    let flags = MessageFlags.IsComponentsV2;
    if (opts.ephemeral) flags |= MessageFlags.Ephemeral;
    if (opts.silent) flags |= MessageFlags.SuppressNotifications;
    return flags;
}

// a deferral doesn't carry content
export function deferFlags(opts: ResolvedDeferOpts): number {
    return opts.ephemeral ? MessageFlags.Ephemeral : 0;
}
