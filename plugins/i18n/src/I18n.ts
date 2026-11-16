import path from 'node:path';

import { Plugin } from '@seedcord/core/plugin';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { formatFilePath, importFiles, readFiles } from '@seedcord/utils';
import { botFolder } from '@seedcord/utils/internal';

import { Catalogs } from './Catalogs';
import { CommandLocalizer } from './CommandLocalizer';
import { translationsIn } from './commandTranslations';
import { isDiscordLocale, localesLike } from './locales';

import type { LocaleFile, MessageTable } from './catalog/checkCatalog';
import type { Translate } from './Catalogs';
import type { LocaleCode } from './locales';
import type { CoreBase, DispatchOrigin } from '@seedcord/core';
import type { Generated, HmrUpdateEvent } from '@seedcord/core/plugin';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';
import type { Promisable } from 'type-fest';

const FTL = '.ftl';

/** The options {@link I18n} takes. */
export interface I18nOptions {
    /** The folder that holds one `.ftl` file per locale, and one `.ts` file per locale for command translations. Defaults to `./locales`. */
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
 *         return { components: [new CartSummary(ctx.t, 0).component] };
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
            const catalogs = await this.loadedCatalogs();
            return catalogs.translator(chosen ?? origin.userLocale ?? origin.guildLocale ?? this.base);
        }
    };

    private readonly dir: string;
    private readonly base: LocaleCode;
    private readonly resolveLocale: I18nOptions['resolveLocale'];

    private catalogs: Promise<Catalogs> | undefined;

    public constructor(host: CoreBase, { dir = './locales', base = 'en-US', resolveLocale }: I18nOptions = {}) {
        super(host);

        if (dir.length === 0) {
            this.rejectOptions(
                `${paint.bold('dir')} is empty. Pass the folder that holds your .ftl files, like ${paint.sky("'./locales'")}`
            );
        }

        // prepareCommands imports the translation files, and the build only bundles code under root
        botFolder(dir).assertBundled();
        this.dir = dir;
        this.base = base;
        this.resolveLocale = resolveLocale;
        this.registerCommandFiles(this.translationFileGlobs);
    }

    public async init(): Promise<void> {
        await this.loadedCatalogs();
    }

    public override async onHmr({ file }: HmrUpdateEvent): Promise<void> {
        if (!this.isCatalogFile(file)) return;
        const startedAt = Date.now();
        this.catalogs = undefined;
        await this.loadedCatalogs();
        this.logger
            .withChannel('hmr')
            .debug(
                `Reloaded ${paint.sky.bold(path.basename(file, FTL))} from ${paint.mute(formatFilePath(file))} ${paint.mute('in')} ${String(Date.now() - startedAt)}ms`
            );
    }

    public override async prepareCommands(commands: readonly RESTPostAPIApplicationCommandsJSONBody[]): Promise<void> {
        const problems: SeedcordError[] = [];
        const folder = botFolder(this.dir);
        const globs = this.translationFileGlobs;
        // a misnamed file never runs because this checks the name before importing it
        const namedForLocale = (fullPath: string, relativePath: string): boolean => {
            const name = path.parse(fullPath).name;
            if (isDiscordLocale(name)) return true;
            problems.push(new SeedcordError(SeedcordErrorCode.PluginI18nNotALocale, [relativePath, localesLike(name)]));
            return false;
        };
        const translationFiles = importFiles(this.dir, {
            filter: ({ fullPath, relativePath }) =>
                folder.matchesFiles(fullPath, globs) && namedForLocale(fullPath, relativePath)
        });
        for await (const { fullPath, relativePath, imported } of translationFiles) {
            const locale = path.parse(fullPath).name;
            // the filter only passes files named after a locale, and this narrows the type
            if (!isDiscordLocale(locale)) continue;
            const translations = translationsIn(imported.default);
            if (!translations) {
                problems.push(new SeedcordError(SeedcordErrorCode.PluginI18nNotTranslations, [relativePath]));
                continue;
            }
            const localizer = new CommandLocalizer(locale, relativePath);
            localizer.apply(commands, translations);
            problems.push(...localizer.problems);
        }
        throwSingleOrAggregate(problems, SeedcordErrorCode.PluginI18nCommandProblems);
    }

    public override async codegen(): Promise<{ messages: MessageTable }> {
        // only codegen needs @fluent/syntax
        const { checkCatalog } = await import('./catalog/checkCatalog');
        const { messages, problems, untranslated } = checkCatalog(await this.localeFiles(), this.base, this.dir);
        for (const { relativePath, missingKeys, fallback } of untranslated) {
            this.logger.info(
                `${paint.path(relativePath)} doesn't have ${missingKeys.map((key) => paint.sky(key)).join(', ')}. Users on that locale get the ${paint.sky(fallback)} text.`
            );
        }
        throwSingleOrAggregate(problems, SeedcordErrorCode.CliProblems);
        return { messages };
    }

    private loadedCatalogs(): Promise<Catalogs> {
        this.catalogs ??= this.localeFiles()
            .then((files) => new Catalogs(new Map(files.map(({ locale, source }) => [locale, source])), this.base))
            .catch((error: unknown) => {
                // the next t() reads the files again
                this.catalogs = undefined;
                throw error;
            });
        return this.catalogs;
    }

    private isDirectlyInDir(file: string): boolean {
        return path.dirname(file) === botFolder(this.dir).path;
    }

    private isCatalogFile(file: string): boolean {
        return this.isDirectlyInDir(file) && file.endsWith(FTL);
    }

    private get translationFileGlobs(): string[] {
        return botFolder(this.dir).moduleGlobsDirectlyIn();
    }

    private async localeFiles(): Promise<LocaleFile[]> {
        const files: LocaleFile[] = [];
        const catalogFiles = readFiles(this.dir, { filter: ({ fullPath }) => this.isCatalogFile(fullPath) });
        for await (const { fullPath, relativePath, bytes } of catalogFiles) {
            files.push({ locale: path.basename(fullPath, FTL), relativePath, source: bytes.toString() });
        }
        return files;
    }
}
