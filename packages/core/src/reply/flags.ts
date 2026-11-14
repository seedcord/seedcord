import { MessageFlags } from 'discord-api-types/v10';

import type { SendOpts } from '@seedcord/types';
import type { Except } from 'type-fest';

// IsComponentsV2 is unconditional, since every framework reply is v2
export function sendFlags(opts: Except<SendOpts, 'ephemeral'> & { readonly ephemeral: boolean }): number {
    let flags = MessageFlags.IsComponentsV2;
    if (opts.ephemeral) flags |= MessageFlags.Ephemeral;
    if (opts.silent) flags |= MessageFlags.SuppressNotifications;
    return flags;
}

// a deferral doesn't carry content
export function deferFlags(ephemeral: boolean): number {
    return ephemeral ? MessageFlags.Ephemeral : 0;
}
