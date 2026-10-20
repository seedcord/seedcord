import { applicationIdFromToken } from '@seedcord/errors/internal';

const AUTHORIZE = 'https://discord.com/oauth2/authorize';

// the token step validates the token, application id included
export function inviteUrl(token: string | null): string | null {
    if (!token) return null;
    // Discord reads the scopes and permissions off the app's Installation tab
    return `${AUTHORIZE}?client_id=${applicationIdFromToken(token)}`;
}
