import { parse, Visitor } from '@fluent/syntax';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { fallbackChain, isDiscordLocale, localesLike } from '#src/locales';
import { messageKey, splitKey } from '#src/messageKey';

import type { LocaleCode } from '#src/locales';
import type {
    FunctionReference,
    Message,
    MessageReference,
    Pattern,
    SelectExpression,
    Term,
    TermReference,
    VariableReference
} from '@fluent/syntax';

export type VariableKind = 'number' | 'text' | readonly string[];
type MessageVariables = Record<string, VariableKind>;
export type MessageTable = Record<string, MessageVariables>;

export interface LocaleFile {
    readonly locale: string;
    readonly relativePath: string;
    readonly source: string;
}

interface Untranslated {
    readonly relativePath: string;
    readonly missingKeys: string[];
    readonly fallback: LocaleCode;
}

export interface CheckedCatalog {
    readonly messages: MessageTable;
    readonly problems: SeedcordError[];
    readonly untranslated: Untranslated[];
}

interface EntryReferences {
    readonly line: number;
    readonly references: ReadonlySet<string>;
}

interface ParsedKey {
    readonly line: number;
    readonly variables: MessageVariables;
}

const PLURAL_CATEGORIES = new Set<string>([
    'zero',
    'one',
    'two',
    'few',
    'many',
    'other'
] satisfies Intl.LDMLPluralRule[]);

function merge(earlier: VariableKind | undefined, incoming: VariableKind): VariableKind {
    if (earlier === undefined) return incoming;
    if (earlier === 'number' || incoming === 'number') return 'number';
    if (typeof earlier === 'string') return incoming;
    if (typeof incoming === 'string') return earlier;
    return [...new Set([...earlier, ...incoming])].toSorted();
}

class EntryScan extends Visitor {
    public readonly variables: MessageVariables = {};
    public readonly references = new Set<string>();

    public override visitSelectExpression(node: SelectExpression): void {
        const { selector } = node;
        if (selector.type !== 'VariableReference') {
            this.genericVisit(node);
            return;
        }
        const keys = node.variants.map(({ key }) => (key.type === 'NumberLiteral' ? key.value : key.name));
        const plural = keys.every((key) => PLURAL_CATEGORIES.has(key) || Number.isFinite(Number(key)));
        this.add(selector.id.name, plural ? 'number' : keys);
        for (const variant of node.variants) this.visit(variant);
    }

    public override visitFunctionReference(node: FunctionReference): void {
        const [first] = node.arguments.positional;
        if (node.id.name === 'NUMBER' && first?.type === 'VariableReference') this.add(first.id.name, 'number');
        this.genericVisit(node);
    }

    public override visitVariableReference(node: VariableReference): void {
        this.add(node.id.name, 'text');
    }

    public override visitTermReference(node: TermReference): void {
        this.references.add(`-${node.id.name}`);
        this.genericVisit(node);
    }

    public override visitMessageReference(node: MessageReference): void {
        this.references.add(node.id.name);
    }

    private add(name: string, kind: VariableKind): void {
        this.variables[name] = merge(this.variables[name], kind);
    }
}

function scan(node: Message | Term | Pattern): EntryScan {
    const entryScan = new EntryScan();
    entryScan.visit(node);
    return entryScan;
}

function keysOf(entry: Message, line: number): [key: string, parsed: ParsedKey][] {
    const id = entry.id.name;
    const keys: [string, ParsedKey][] = entry.attributes.map(({ id: attribute, value }) => [
        messageKey(id, attribute.name),
        { line, variables: scan(value).variables }
    ]);
    if (entry.value) keys.unshift([messageKey(id), { line, variables: scan(entry.value).variables }]);
    return keys;
}

function describe(key: string): string {
    const [id, attribute] = splitKey(key);
    return attribute === undefined
        ? `the message ${paint.sky(id)}`
        : `${paint.sky(`.${attribute}`)} on ${paint.sky(id)}`;
}

function lineAt(source: string, offset: number): number {
    return source.slice(0, offset).split('\n').length;
}

class CatalogCheck {
    private readonly problems: SeedcordError[] = [];
    private readonly baseFile: string;

    public constructor(
        private readonly files: readonly LocaleFile[],
        private readonly base: LocaleCode,
        private readonly dir: string
    ) {
        this.baseFile = `${base}.ftl`;
    }

    public run(): CheckedCatalog {
        const parsed = new Map(this.files.map((file) => [file.locale, { file, messages: this.parse(file) }]));

        const baseMessages = parsed.get(this.base)?.messages;
        if (!baseMessages) {
            this.problems.push(new SeedcordError(SeedcordErrorCode.PluginI18nBaseMissing, [this.dir, this.baseFile]));
            return { messages: {}, problems: this.problems, untranslated: [] };
        }

        const untranslated: Untranslated[] = [];
        for (const [locale, { file, messages }] of parsed) {
            if (locale === this.base || !isDiscordLocale(locale)) continue;
            const missing = [...baseMessages.keys()].filter((key) => !messages.has(key));
            const byFallback = Map.groupBy(missing, (key) => this.fallbackFor(locale, key, parsed));
            for (const [fallback, missingKeys] of byFallback) {
                untranslated.push({ relativePath: file.relativePath, missingKeys, fallback });
            }
            for (const [key, parsedKey] of messages)
                this.compare(file.relativePath, key, parsedKey, baseMessages.get(key));
        }
        const messages = Object.fromEntries(baseMessages.entries().map(([key, { variables }]) => [key, variables]));
        return { messages, problems: this.problems, untranslated };
    }

    // the paired locale, like es-ES for es-419, if its file has the key, or else base
    private fallbackFor(
        locale: LocaleCode,
        key: string,
        parsed: ReadonlyMap<string, { readonly messages: ReadonlyMap<string, ParsedKey> }>
    ): LocaleCode {
        const pairs = fallbackChain(locale, this.base).filter((code) => code !== locale && code !== this.base);
        return pairs.find((code) => parsed.get(code)?.messages.has(key)) ?? this.base;
    }

    private parse({ locale, relativePath, source }: LocaleFile): Map<string, ParsedKey> {
        if (!isDiscordLocale(locale)) {
            this.problems.push(
                new SeedcordError(SeedcordErrorCode.PluginI18nNotALocale, [relativePath, localesLike(locale)])
            );
        }

        const messages = new Map<string, ParsedKey>();
        const defined = new Set<string>();
        const uses: EntryReferences[] = [];
        for (const entry of parse(source, { withSpans: true }).body) {
            const line = lineAt(source, entry.span?.start ?? 0);
            if (entry.type === 'Junk') {
                const detail = entry.annotations.map(({ message }) => message).join(', ');
                this.problems.push(
                    new SeedcordError(SeedcordErrorCode.PluginI18nSyntax, [`${relativePath}:${line}`, detail])
                );
            }
            if (entry.type !== 'Message' && entry.type !== 'Term') continue;

            uses.push({ line, references: scan(entry).references });
            if (entry.type === 'Term') {
                defined.add(`-${entry.id.name}`);
            } else {
                defined.add(entry.id.name);
                for (const [key, parsedKey] of keysOf(entry, line)) messages.set(key, parsedKey);
            }
        }
        this.checkReferences(relativePath, uses, defined);
        return messages;
    }

    // a reference to another file's term doesn't resolve because fluent formats each file on its own
    private checkReferences(
        relativePath: string,
        uses: readonly EntryReferences[],
        defined: ReadonlySet<string>
    ): void {
        for (const { line, references } of uses) {
            for (const reference of references) {
                if (defined.has(reference)) continue;
                const place = `${relativePath}:${line}`;
                this.problems.push(new SeedcordError(SeedcordErrorCode.PluginI18nMissingReference, [place, reference]));
            }
        }
    }

    private compare(
        relativePath: string,
        key: string,
        { line, variables }: ParsedKey,
        inBase: ParsedKey | undefined
    ): void {
        const at = `${relativePath}:${line}`;
        if (!inBase) {
            this.notInBase(at, describe(key));
            return;
        }

        // each translation merges its variables into the base key's
        for (const [name, kind] of Object.entries(variables)) {
            if (Object.hasOwn(inBase.variables, name)) inBase.variables[name] = merge(inBase.variables[name], kind);
            else this.notInBase(at, `${paint.sky(`$${name}`)} in ${paint.sky(key)}`);
        }
    }

    private notInBase(at: string, what: string): void {
        this.problems.push(new SeedcordError(SeedcordErrorCode.PluginI18nNotInBase, [at, what, this.baseFile]));
    }
}

export function checkCatalog(files: readonly LocaleFile[], base: LocaleCode, dir: string): CheckedCatalog {
    return new CatalogCheck(files, base, dir).run();
}
