import { MessageFlags } from 'discord-api-types/v10';

// IsComponentsV2 is unconditional, every framework reply is ComponentsV2
/** @internal */
export function flagsFor(ephemeral: boolean): number {
    let flags = MessageFlags.IsComponentsV2;
    if (ephemeral) flags |= MessageFlags.Ephemeral;
    return flags;
}
