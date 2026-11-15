import { Locale } from 'discord-api-types/v10';

const DISCORD_LOCALES = new Set<string>(Object.values(Locale));

export function isDiscordLocale(name: string): name is Locale {
    return DISCORD_LOCALES.has(name);
}

// en suggests en-US and en-GB
export function localesLike(name: string): Locale[] {
    const [language] = name.split('-');
    return Object.values(Locale).filter((locale) => locale.split('-')[0] === language);
}
