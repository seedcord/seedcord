import { REST } from '@discordjs/rest';
import { readBotToken } from '@seedcord/core/internal';

export function restFromEnv(): REST {
    return new REST({ version: '10' }).setToken(readBotToken().value);
}
