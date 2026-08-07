import { MessageFlags } from 'discord-api-types/v10';

import type { DeferOpts, SendOpts } from '@seedcord/types';

// IsComponentsV2 is unconditional, since every framework reply is v2
export function sendFlags(opts?: SendOpts): number {
    let flags = MessageFlags.IsComponentsV2;
    if (opts?.ephemeral ?? true) flags |= MessageFlags.Ephemeral;
    if (opts?.silent) flags |= MessageFlags.SuppressNotifications;
    return flags;
}

// a deferral carries no content
export function deferFlags(opts?: DeferOpts): number {
    return (opts?.ephemeral ?? true) ? MessageFlags.Ephemeral : 0;
}
