import { Plugin } from '@seedcord/core/plugin';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { importFiles, readFiles } from '@seedcord/utils';
import { once } from 'es-toolkit';

import { Catalogs } from './Catalogs';
import { CommandLocalizer } from './CommandLocalizer';
import { translationsIn } from './commandTranslations';
import { isDiscordLocale, localesLike } from './locales';

import type { LocaleFile, MessageTable } from './catalog/checkCatalog';
import type { Translate } from './Catalogs';
import type { LocaleCode } from './locales';
import type { CoreBase, DispatchOrigin } from '@seedcord/core';
import type { Generated } from '@seedcord/core/plugin';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';
import type { Promisable } from 'type-fest';

const FTL = '.ftl';

/** The options {@link I18n} takes. */
export interface I18nOptions {
    /** The folder that holds one `.ftl` file per locale, and the command translations in its `commands` folder. Defaults to `./locales`. */
    readonly dir?: string;
    /** The locale whose file lists every message and the variables each one takes. Defaults to `en-US`. */
    readonly base?: LocaleCode;
    /**
     * Picks the locale for an interaction or event, like a language that the user picked in your bot. When it
     * returns `undefined` or `null`, the plugin uses the user's Discord language, then the guild's, then `base`.
     */
    readonly resolveLocale?: (origin: DispatchOrigin) => Promisable<LocaleCode | null | undefined>;
}

/**
 * Gives every handler `this.t`, which formats your Fluent messages in the user's language.
 *
 * Put one `.ftl` file per Discord locale in `dir`, like `en-US.ftl` and `pl.ftl`. In gates and
 * `Notice.render`, read the same function from `ctx.t`.
 *
 * @example
 * ```ftl
 * # locales/en-US.ftl
 * # the base file. add a message or variable here before you translate it
 *
 * greeting = Hello { $user }!
 *
 * items = { $count ->
 *     [one] You have { $count } item
 *    *[other] You have { $count } items
 * }
 * ```
 *
 * @example
 * ```ts
 * // seedcord.config.ts
 * export default defineConfig({
 *     files: ['./locales']
 * });
 *
 * // bot.ts
 * seedcord.attach('i18n', I18n, { dir: './locales', base: 'en-US' });
 * ```
 *
 * @example
 * ```ts
 * // in a handler after you edit a .ftl file,
 * // run seedcord codegen to update what t accepts
 * await this.reply(this.t('greeting', { user: this.event.user.username }));
 * await this.reply(this.t('items', { count: cart.length }));
 * ```
 *
 * @example
 * ```ts
 * // pass this.t to a component's constructor to translate inside it
 * import { BuilderComponent, type DispatchMemberValues } from '@seedcord/gateway';
 * import { TextDisplayBuilder } from '@discordjs/builders';
 *
 * class CartSummary extends BuilderComponent<'container'> {
 *     constructor(t: DispatchMemberValues['t'], count: number) {
 *         super('container');
 *
 *         const text = new TextDisplayBuilder().setContent(t('items', { count }));
 *         this.instance.addTextDisplayComponents(text);
 *     }
 * }
 *
 * // in the handler
 * const summary = new CartSummary(this.t, cart.length);
 * await this.reply({ components: [summary.component] });
 * ```
 *
 * @example
 * ```ts
 * // in a Notice, read ctx.t. it formats in the same language as the handler's this.t
 * class EmptyCart extends Notice {
 *     constructor() {
 *         super('cart is empty');
 *     }
 *
 *     override render(ctx: RenderContext): ReplyResponse {
 *         return { content: ctx.t('items', { count: 0 }) };
 *     }
 * }
 * ```
 *
 * @example
 * ```ts
 * // return a language the user saved with your bot to use it over their Discord language
 * seedcord.attach('i18n', I18n, {
 *     resolveLocale: async ({ userId }) => {
 *         if (!userId) return undefined;
 *         return languages.get(userId);
 *     }
 * });
 * ```
 *
 * @example
 * ```ts
 * // t.locale is the locale t formats in. use it for dates and numbers
 * const joined = new Intl.DateTimeFormat(this.t.locale).format(member.joinedAt);
 * ```
 */
export class I18n extends Plugin {
    public static readonly id = '@seedcord/plugin-i18n';

    public override readonly dispatchMembers = {
        t: async (origin: DispatchOrigin): Promise<Translate<Generated<typeof I18n>['messages']>> => {
            const chosen = await this.resolveLocale?.(origin);
            const catalogs = await this.catalogs();
            return catalogs.translator(chosen ?? origin.userLocale ?? origin.guildLocale ?? this.base);
        }
    };

    private readonly dir: string;
    private readonly base: LocaleCode;
    private readonly resolveLocale: I18nOptions['resolveLocale'];

    private readonly catalogs = once(async () => {
        const files = await this.localeFiles();
        return new Catalogs(new Map(files.map(({ locale, source }) => [locale, source])), this.base);
    });

    public constructor(host: CoreBase, { dir = './locales', base = 'en-US', resolveLocale }: I18nOptions = {}) {
        super(host);

        if (dir.length === 0) {
            this.rejectOptions(
                `${paint.bold('dir')} is empty. Pass the folder that holds your .ftl files, like ${paint.sky("'./locales'")}`
            );
        }

        this.dir = dir;
        this.base = base;
        this.resolveLocale = resolveLocale;
    }

    public async init(): Promise<void> {
        await this.catalogs();
    }

    public override async prepareCommands(commands: readonly RESTPostAPIApplicationCommandsJSONBody[]): Promise<void> {
        const problems: SeedcordError[] = [];
        for await (const { pathInDir, relativePath, imported } of importFiles(this.dir)) {
            if (pathInDir.includes('/')) continue;
            const locale = pathInDir.slice(0, pathInDir.lastIndexOf('.'));
            const translations = translationsIn(imported.default);
            if (!isDiscordLocale(locale)) {
                problems.push(
                    new SeedcordError(SeedcordErrorCode.PluginI18nNotALocale, [relativePath, localesLike(locale)])
                );
            } else if (!translations) {
                problems.push(new SeedcordError(SeedcordErrorCode.PluginI18nNotTranslations, [relativePath]));
            } else {
                const localizer = new CommandLocalizer(locale, relativePath);
                localizer.apply(commands, translations);
                problems.push(...localizer.problems);
            }
        }
        throwSingleOrAggregate(problems, SeedcordErrorCode.CliProblems);
    }

    public override async codegen(): Promise<{ messages: MessageTable }> {
        // a running bot doesn't need to load @fluent/syntax as only codegen needs it
        const { checkCatalog } = await import('./catalog/checkCatalog');
        const { messages, problems, untranslated } = checkCatalog(await this.localeFiles(), this.base, this.dir);
        for (const { relativePath, keys } of untranslated) {
            this.logger.info(
                `${paint.path(relativePath)} doesn't have ${keys.map((key) => paint.sky(key)).join(', ')}. Users on that locale get the ${this.base} text for them.`
            );
        }
        throwSingleOrAggregate(problems, SeedcordErrorCode.CliProblems);
        return { messages };
    }

    private async localeFiles(): Promise<LocaleFile[]> {
        const files: LocaleFile[] = [];
        for await (const { pathInDir, relativePath, bytes } of readFiles(this.dir)) {
            // a subfolder like commands/ holds the command translations
            if (pathInDir.includes('/') || !pathInDir.endsWith(FTL)) continue;
            files.push({ locale: pathInDir.slice(0, -FTL.length), relativePath, source: bytes.toString() });
        }
        return files;
    }
}
