import type { MessageContextMenuRegistry, SlashRegistry, UserContextMenuRegistry } from '@seedcord/core';
import type { Simplify } from 'type-fest';

// two copies of the plugin get the same Symbol.for symbol and accept each other's files
const TRANSLATIONS = Symbol.for('@seedcord/plugin-i18n:command-translations');

type SlashRoute = Extract<keyof SlashRegistry, string>;

// 'config/logs/set' starts with 'config'
type FirstName<Route extends string> = Route extends `${infer Name}/${string}` ? Name : Route;
type RoutesBelow<Path extends string> = SlashRoute extends infer Route
    ? Route extends `${Path}/${infer Rest}`
        ? Rest
        : never
    : never;

interface Described {
    readonly name?: string;
    readonly description?: string;
}

type Section<Value> = Readonly<Record<string, Value | undefined>>;

interface OptionText extends Described {
    readonly choices?: Section<string>;
}

interface SlashText extends Described {
    readonly options?: Section<OptionText>;
    readonly subcommands?: Section<SlashText>;
}

// what a file holds at run time, whatever commands the bot has. every CommandTranslations fits it
export interface TranslationTree {
    readonly slash?: Section<SlashText>;
    readonly userMenus?: Section<string>;
    readonly messageMenus?: Section<string>;
}

type OptionTranslation<Option> = Simplify<
    Described &
        (Option extends { choices: readonly (infer Value extends string | number)[] }
            ? { readonly choices?: Readonly<Partial<Record<`${Value}`, string>>> }
            : unknown)
>;

// an empty options table would type as {}, which TypeScript lets any object through
type OptionsOf<Path extends string> = Path extends SlashRoute
    ? SlashRegistry[Path] extends { options: infer Options }
        ? [keyof Options] extends [never]
            ? unknown
            : { readonly options?: { readonly [Name in keyof Options]?: OptionTranslation<Options[Name]> } }
        : unknown
    : unknown;

type SubcommandsOf<Path extends string> = [RoutesBelow<Path>] extends [never]
    ? unknown
    : {
          readonly subcommands?: {
              readonly [Name in FirstName<RoutesBelow<Path>>]?: SlashTranslation<`${Path}/${Name}`>;
          };
      };

type SlashTranslation<Path extends string> = Simplify<Described & OptionsOf<Path> & SubcommandsOf<Path>>;

/** The command translations for one locale, keyed by each command's English name. Every field is optional. */
export interface CommandTranslations {
    readonly slash?: { readonly [Name in FirstName<SlashRoute>]?: SlashTranslation<Name> };
    readonly userMenus?: { readonly [Name in keyof UserContextMenuRegistry]?: string };
    readonly messageMenus?: { readonly [Name in keyof MessageContextMenuRegistry]?: string };
}

interface CommandTranslationFile {
    readonly [TRANSLATIONS]: CommandTranslations;
}

/**
 * Wraps one locale's command translations. Export it as the default from `locales/<locale>.ts`, like
 * `locales/pl.ts`. Before each deploy, the plugin adds the translations to your commands.
 *
 * @example
 * ```ts
 * // locales/pl.ts
 * import { commandTranslations } from '@seedcord/plugin-i18n';
 *
 * export default commandTranslations({
 *     slash: {
 *         config: {
 *             name: 'konfiguracja',
 *             description: 'Ustawienia bota',
 *             subcommands: {
 *                 set: { name: 'ustaw', description: 'Zmień ustawienie' }
 *             }
 *         },
 *         search: {
 *             options: {
 *                 category: { choices: { books: 'książki', films: 'filmy' } }
 *             }
 *         }
 *     },
 *     userMenus: { 'View Profile': 'Pokaż profil' }
 * });
 * ```
 */
export function commandTranslations(translations: CommandTranslations): CommandTranslationFile {
    return { [TRANSLATIONS]: translations };
}

export function translationsIn(exported: unknown): TranslationTree | undefined {
    if (typeof exported !== 'object' || exported === null || !(TRANSLATIONS in exported)) return undefined;
    // justified: only commandTranslations() writes this symbol, and its argument fits TranslationTree
    return exported[TRANSLATIONS] as TranslationTree;
}
