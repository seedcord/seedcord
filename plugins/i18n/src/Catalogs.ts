import { FluentBundle, FluentResource } from '@fluent/bundle';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import { fallbackChain } from './locales';
import { splitKey } from './messageKey';

import type { MessageTable, VariableKind } from './catalog/checkCatalog';
import type { LocaleCode } from './locales';
import type { FluentVariable } from '@fluent/bundle';
import type { LiteralUnion } from 'type-fest';

type ArgOf<Kind extends VariableKind> = Kind extends 'number'
    ? number
    : Kind extends readonly (infer Key extends string)[]
      ? LiteralUnion<Key, string>
      : string | number;

type ArgsOf<Variables extends MessageTable[string]> = keyof Variables extends never
    ? []
    : [args: { readonly [Name in keyof Variables]: ArgOf<Variables[Name]> }];

type Args = Readonly<Record<string, FluentVariable>>;

/** Formats a message in one locale. `locale` is the locale whose file it reads first. */
export type Translate<Messages extends MessageTable> = (<Key extends keyof Messages & string>(
    key: Key,
    ...args: ArgsOf<Messages[Key]>
) => string) & { readonly locale: LocaleCode };

export class Catalogs {
    private readonly bundles = new Map<LocaleCode, FluentBundle>();

    public constructor(
        private readonly sources: ReadonlyMap<string, string>,
        private readonly base: LocaleCode
    ) {}

    public translator<Messages extends MessageTable>(wanted: LocaleCode): Translate<Messages> {
        const locale = fallbackChain(wanted, this.base).find((code) => this.sources.has(code)) ?? this.base;
        const t = <Key extends keyof Messages & string>(key: Key, ...args: ArgsOf<Messages[Key]>): string =>
            this.format(locale, key, ...args);
        return Object.assign(t, { locale });
    }

    private format(locale: LocaleCode, key: string, args?: Args): string {
        const [id, attribute] = splitKey(key);
        for (const code of fallbackChain(locale, this.base)) {
            const bundle = this.bundle(code);
            const message = bundle?.getMessage(id);
            const pattern = attribute === undefined ? message?.value : message?.attributes[attribute];
            if (!bundle || !pattern) continue;
            try {
                return bundle.formatPattern(pattern, args);
            } catch (error) {
                throw new SeedcordError(SeedcordErrorCode.PluginI18nFormatFailed, [
                    key,
                    `${code}.ftl`,
                    asError(error).message
                ]);
            }
        }
        throw new SeedcordError(SeedcordErrorCode.PluginI18nOutOfDate, [key]);
    }

    // parses each locale the first time a t() reads it
    private bundle(locale: LocaleCode): FluentBundle | undefined {
        const cached = this.bundles.get(locale);
        if (cached) return cached;
        const source = this.sources.get(locale);
        if (source === undefined) return undefined;
        const bundle = new FluentBundle(locale, { useIsolating: false });
        bundle.addResource(new FluentResource(source));
        this.bundles.set(locale, bundle);
        return bundle;
    }
}
