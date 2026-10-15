import { commandRefOf } from '@seedcord/core/internal';

import type { CommandBody } from '@seedcord/core/internal';
import type { APIApplicationCommand } from 'discord-api-types/v10';

export interface ScopeDiff {
    added: CommandBody[];
    removed: APIApplicationCommand[];
    // an edited description still counts as kept
    kept: CommandBody[];
}

function sameCommand(a: CommandBody | APIApplicationCommand, b: CommandBody | APIApplicationCommand): boolean {
    const [left, right] = [commandRefOf(a), commandRefOf(b)];
    return left.name === right.name && left.type === right.type;
}

export function diffScope(inCode: readonly CommandBody[], deployed: Iterable<APIApplicationCommand>): ScopeDiff {
    const onDiscord = [...deployed];
    const isDeployed = (command: CommandBody): boolean => onDiscord.some((other) => sameCommand(command, other));
    return {
        added: inCode.filter((command) => !isDeployed(command)),
        removed: onDiscord.filter((command) => !inCode.some((other) => sameCommand(command, other))),
        kept: inCode.filter(isDeployed)
    };
}
