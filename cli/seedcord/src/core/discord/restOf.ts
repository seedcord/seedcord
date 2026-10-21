import { REST } from '@discordjs/rest';
import { readBotToken } from '@seedcord/core/internal';

import type { RESTOptions } from '@discordjs/rest';
import type { SeedcordInstance } from '@seedcord/types/internal';

// the token and overrides stay off the bot's own client
export function restOf(instance: Pick<SeedcordInstance, 'rest'>, overrides: Partial<RESTOptions> = {}): REST {
    return new REST({ ...instance.rest.options, ...overrides }).setToken(readBotToken().value);
}
