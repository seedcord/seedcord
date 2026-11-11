import { hasKeys } from '@seedcord/utils';
import { MessageFlags } from 'discord-api-types/v10';

import type { InteractionsConfig, SendOpts } from '@seedcord/types';
import type { Except } from 'type-fest';

export type ResolvedSendOpts = Except<SendOpts, 'ephemeral'> & { readonly ephemeral: boolean };

export function ephemeralDefault(interactions: InteractionsConfig): boolean {
    return hasKeys(interactions, ['ephemeral']) ? interactions.ephemeral : true;
}

// IsComponentsV2 is unconditional, since every framework reply is v2
export function sendFlags(opts: ResolvedSendOpts): number {
    let flags = MessageFlags.IsComponentsV2;
    if (opts.ephemeral) flags |= MessageFlags.Ephemeral;
    if (opts.silent) flags |= MessageFlags.SuppressNotifications;
    return flags;
}

// a deferral doesn't carry content
export function deferFlags(ephemeral: boolean): number {
    return ephemeral ? MessageFlags.Ephemeral : 0;
}
