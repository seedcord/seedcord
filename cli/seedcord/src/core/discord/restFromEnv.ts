import { REST } from '@discordjs/rest';
import { validateDiscordToken } from '@seedcord/errors/internal';
import { Envapter } from 'envapt';

// needs the project open first. opening it loads .env
export function restFromEnv(): REST {
    return new REST({ version: '10' }).setToken(validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN')));
}
