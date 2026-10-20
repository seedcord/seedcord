import { validateDiscordToken } from '@seedcord/errors/internal';
import { Envapter } from 'envapt';

import type { BotToken } from '@seedcord/errors/internal';

export function readBotToken(): BotToken {
    return validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN'));
}
