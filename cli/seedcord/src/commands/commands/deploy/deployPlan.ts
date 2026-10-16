import { commandKey } from '@seedcord/core/internal';

import type { CommandBody } from '@seedcord/core/internal';
import type { APIApplicationCommand } from 'discord-api-types/v10';

export interface ScopeDiff {
    added: CommandBody[];
    removed: APIApplicationCommand[];
    // an edited description still counts as kept
    kept: CommandBody[];
}

export function diffScope(inCode: readonly CommandBody[], deployed: Iterable<APIApplicationCommand>): ScopeDiff {
    const onDiscord = [...deployed];
    const deployedKeys = new Set(onDiscord.map(commandKey));
    const codeKeys = new Set(inCode.map(commandKey));
    return {
        added: inCode.filter((command) => !deployedKeys.has(commandKey(command))),
        removed: onDiscord.filter((command) => !codeKeys.has(commandKey(command))),
        kept: inCode.filter((command) => deployedKeys.has(commandKey(command)))
    };
}
