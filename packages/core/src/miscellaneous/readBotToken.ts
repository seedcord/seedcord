import { validateDiscordToken } from '@seedcord/errors/internal';
import { Envapter } from 'envapt';

export function readBotToken(): string {
    return validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN'));
}
