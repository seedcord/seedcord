const FALLBACK_URL = 'https://seedcord.org';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_URL;
export const SITE_NAME = 'seedcord';
export const SITE_DESCRIPTION =
    'A TypeScript framework for Discord bots. Generated slash-option types, a typed customId codec, composable gates, and hot reload, all on top of discord.js.';
export const REPO_URL = 'https://github.com/seedcord/seedcord';

export function canonicalUrl(path: string): string {
    return new URL(path, SITE_URL).toString();
}
