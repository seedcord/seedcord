import { MessageFlags } from 'discord.js';

/**
 * Builds the `flags` bitfield for a framework reply. Every framework reply is ComponentsV2, so the
 * IsComponentsV2 flag is always set.
 *
 * @param ephemeral - Whether the reply is ephemeral.
 * @returns The OR'd `MessageFlags` value as a plain number.
 *
 * @internal
 */
export function flagsFor(ephemeral: boolean): number {
    let flags = MessageFlags.IsComponentsV2;
    if (ephemeral) flags |= MessageFlags.Ephemeral;
    return flags;
}
