import { Plugin } from '@seedcord/core/plugin';
import { paint } from '@seedcord/errors';

import type { CoreBase } from '@seedcord/core';

/** The options {@link I18n} takes. */
export interface I18nOptions {
    /** The folder that holds one `.ftl` file per locale, and the command translations in its `commands` folder. Defaults to `./locales`. */
    readonly dir?: string;
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

    public constructor(host: CoreBase, { dir = './locales' }: I18nOptions = {}) {
        super(host);

        if (dir.length === 0) {
            this.rejectOptions(
                `${paint.bold('dir')} is empty. Pass the folder that holds your .ftl files, like ${paint.sky("'./locales'")}`
            );
        }
    }

    public init(): void {}
}
