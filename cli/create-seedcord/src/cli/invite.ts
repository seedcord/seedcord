import type { BotToken } from '@seedcord/errors/internal';

const AUTHORIZE = 'https://discord.com/oauth2/authorize';

export function inviteUrl(token: BotToken | null): string | null {
    if (!token) return null;
    // Discord reads the scopes and permissions off the app's Installation tab
    return `${AUTHORIZE}?client_id=${token.applicationId}`;
}
