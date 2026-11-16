import { parse, Visitor } from '@fluent/syntax';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { fallbackChain, isDiscordLocale, localesLike } from '#src/locales';

import type { LocaleCode } from '#src/locales';
import type {
    FunctionReference,
    Message,
    MessageReference,
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

interface ParsedMessage {
    readonly entry: Message;
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

function scan(entry: Message | Term): EntryScan {
    const entryScan = new EntryScan();
    entryScan.visit(entry);
    return entryScan;
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
            for (const [key, message] of messages) this.compare(file.relativePath, key, message, baseMessages.get(key));
        }
        // t() can't format a message that only has attributes
        const withText = baseMessages.entries().filter(([, { entry }]) => entry.value !== null);
        const messages = Object.fromEntries(withText.map(([key, { variables }]) => [key, variables]));
        return { messages, problems: this.problems, untranslated };
    }

    // the paired locale, like es-ES for es-419, if its file has the key, or else base
    private fallbackFor(
        locale: LocaleCode,
        key: string,
        parsed: ReadonlyMap<string, { readonly messages: ReadonlyMap<string, ParsedMessage> }>
    ): LocaleCode {
        const pairs = fallbackChain(locale, this.base).filter((code) => code !== locale && code !== this.base);
        return pairs.find((code) => parsed.get(code)?.messages.has(key)) ?? this.base;
    }

    private parse({ locale, relativePath, source }: LocaleFile): Map<string, ParsedMessage> {
        if (!isDiscordLocale(locale)) {
            this.problems.push(
                new SeedcordError(SeedcordErrorCode.PluginI18nNotALocale, [relativePath, localesLike(locale)])
            );
        }

        const messages = new Map<string, ParsedMessage>();
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

            const { variables, references } = scan(entry);
            uses.push({ line, references });
            if (entry.type === 'Term') {
                defined.add(`-${entry.id.name}`);
            } else {
                defined.add(entry.id.name);
                messages.set(entry.id.name, { entry, line, variables });
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
        { entry, line, variables }: ParsedMessage,
        inBase: ParsedMessage | undefined
    ): void {
        const at = `${relativePath}:${line}`;
        if (!inBase) {
            this.notInBase(at, `the message ${paint.sky(key)}`);
            return;
        }

        // each translation merges its variables into the base message's
        for (const [name, kind] of Object.entries(variables)) {
            if (Object.hasOwn(inBase.variables, name)) inBase.variables[name] = merge(inBase.variables[name], kind);
            else this.notInBase(at, `${paint.sky(`$${name}`)} in ${paint.sky(key)}`);
        }

        const baseAttributes = new Set(inBase.entry.attributes.map(({ id }) => id.name));
        for (const { id } of entry.attributes) {
            if (!baseAttributes.has(id.name)) this.notInBase(at, `${paint.sky(`.${id.name}`)} on ${paint.sky(key)}`);
        }
    }

    private notInBase(at: string, what: string): void {
        this.problems.push(new SeedcordError(SeedcordErrorCode.PluginI18nNotInBase, [at, what, this.baseFile]));
    }
}

export function checkCatalog(files: readonly LocaleFile[], base: LocaleCode, dir: string): CheckedCatalog {
    return new CatalogCheck(files, base, dir).run();
}
