import { MessageFlags } from 'discord.js';

/**
 * Builds the `flags` bitfield for an interaction reply.
 *
 * @param v2 - Whether the reply carries ComponentsV2 top-level components.
 * @param ephemeral - Whether the reply is ephemeral.
 * @returns The OR'd `MessageFlags` value as a plain number.
 *
 * @internal
 */
export function flagsFor(v2: boolean, ephemeral: boolean): number {
    let flags = 0;
    if (v2) flags |= MessageFlags.IsComponentsV2;
    if (ephemeral) flags |= MessageFlags.Ephemeral;
    return flags;
}
