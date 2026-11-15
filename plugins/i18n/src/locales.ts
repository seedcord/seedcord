import { Locale } from 'discord-api-types/v10';

export type LocaleCode = `${Locale}`;

const DISCORD_LOCALES = new Set<string>(Object.values(Locale));

// t reads a locale's pair before the base locale
const PAIRS: Partial<Record<LocaleCode, LocaleCode>> = {
    'en-US': 'en-GB',
    'en-GB': 'en-US',
    'es-ES': 'es-419',
    'es-419': 'es-ES'
};

export function isDiscordLocale(name: string): name is Locale {
    return DISCORD_LOCALES.has(name);
}

// localesLike('en') returns en-US and en-GB
export function localesLike(name: string): Locale[] {
    const [language] = name.split('-');
    return Object.values(Locale).filter((locale) => locale.split('-')[0] === language);
}

export function fallbackChain(locale: LocaleCode, base: LocaleCode): LocaleCode[] {
    const pair = PAIRS[locale];
    return [...new Set([locale, ...(pair ? [pair] : []), base])];
}
