import { ApplicationCommandType } from 'discord-api-types/v10';

import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

export interface ContextMenuLeaves {
    readonly user: Set<string>;
    readonly message: Set<string>;
}

// a user and a message command can share a name
export function contextMenuLeaves(commands: Iterable<RESTPostAPIApplicationCommandsJSONBody>): ContextMenuLeaves {
    const user = new Set<string>();
    const message = new Set<string>();
    for (const command of commands) {
        if (command.type === ApplicationCommandType.User) user.add(command.name);
        else if (command.type === ApplicationCommandType.Message) message.add(command.name);
    }
    return { user, message };
}
