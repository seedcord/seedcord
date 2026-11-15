import { Plugin } from '@seedcord/core/plugin';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { throwSingleOrAggregate } from '@seedcord/errors/internal';
import { readFiles } from '@seedcord/utils';

import type { LocaleFile, MessageVariables } from './catalog/checkCatalog';
import type { CoreBase } from '@seedcord/core';
import type { Locale } from 'discord-api-types/v10';

const FTL = '.ftl';

/** The options {@link I18n} takes. */
export interface I18nOptions {
    /** The folder that holds one `.ftl` file per locale, and the command translations in its `commands` folder. Defaults to `./locales`. */
    readonly dir?: string;
    /** The locale whose file lists every message and the variables each one takes. Defaults to `en-US`. */
    readonly base?: `${Locale}`;
}

/**
 * Translates the bot's replies and commands from Fluent `.ftl` files, one per Discord locale.
 *
 * @example
 * ```ts
 * seedcord.attach('i18n', I18n, { dir: './locales' });
 * ```
 */
export class I18n extends Plugin {
    public static readonly id = '@seedcord/plugin-i18n';

    private readonly dir: string;
    private readonly base: Required<I18nOptions>['base'];

    public constructor(host: CoreBase, { dir = './locales', base = 'en-US' }: I18nOptions = {}) {
        super(host);

        if (dir.length === 0) {
            this.rejectOptions(
                `${paint.bold('dir')} is empty. Pass the folder that holds your .ftl files, like ${paint.sky("'./locales'")}`
            );
        }

        this.dir = dir;
        this.base = base;
    }

    public init(): void {}

    public override async codegen(): Promise<{ messages: Record<string, MessageVariables> }> {
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
