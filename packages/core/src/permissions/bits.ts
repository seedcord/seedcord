import { prettify } from '@seedcord/utils';
import { PermissionFlagsBits } from 'discord-api-types/v10';

/**
 * The permission flag bits a caller or the bot must hold. Pass the `PermissionFlagsBits` values from
 * `discord-api-types/v10` (or `discord.js`).
 */
export type PermissionScope = readonly bigint[];

// permission bit to its prettified human-readable name
export const PermissionNames = new Map<bigint, string>(
    Object.entries(PermissionFlagsBits).map(([key, bit]) => [bit, prettify(key)])
);

const ADMINISTRATOR = PermissionFlagsBits.Administrator;

function nameOf(bit: bigint): string {
    return PermissionNames.get(bit) ?? String(bit);
}

// discord treats the administrator bit as granting every permission
function holds(held: bigint, bit: bigint): boolean {
    return (held & ADMINISTRATOR) === ADMINISTRATOR || (held & bit) === bit;
}

function namesWhere(held: bigint, scope: PermissionScope, isHeld: boolean): string[] {
    return scope.reduce<string[]>((names, bit) => {
        if (holds(held, bit) === isHeld) names.push(nameOf(bit));
        return names;
    }, []);
}

/** @internal */
export function missingNames(held: bigint, scope: PermissionScope): string[] {
    return namesWhere(held, scope, false);
}

/** @internal */
export function presentNames(held: bigint, scope: PermissionScope): string[] {
    return namesWhere(held, scope, true);
}
