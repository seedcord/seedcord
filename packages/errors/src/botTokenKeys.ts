import { oneOf } from './messageText';

// the bot reads the first of these that is set
export const BOT_TOKEN_KEYS = ['DISCORD_BOT_TOKEN', 'BOT_TOKEN'] as const;

export const BOT_TOKEN_ENV = oneOf.format(BOT_TOKEN_KEYS);
