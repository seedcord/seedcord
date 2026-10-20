import { validateDiscordToken } from '@seedcord/errors/internal';

const HMAC_CHARS = 38;

// discord builds the first part from the application id
function tokenFor(applicationId: string): string {
    return `${Buffer.from(applicationId, 'utf8').toString('base64url')}.bbbbbb.${'c'.repeat(HMAC_CHARS)}`;
}

export const TOKEN = tokenFor('1195232619718254663');
export const BOT_TOKEN = validateDiscordToken(TOKEN);
