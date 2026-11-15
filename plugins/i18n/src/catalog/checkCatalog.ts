import { parse, Visitor } from '@fluent/syntax';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { isDiscordLocale, localesLike } from '#src/locales';

import type { FunctionReference, Message, SelectExpression, VariableReference } from '@fluent/syntax';

export type VariableKind = 'number' | 'text' | readonly string[];
type MessageVariables = Record<string, VariableKind>;
export type MessageTable = Record<string, MessageVariables>;

export interface LocaleFile {
    readonly locale: string;
    readonly relativePath: string;
    readonly source: string;
}

export interface CheckedCatalog {
    readonly messages: MessageTable;
    readonly problems: SeedcordError[];
    readonly untranslated: { readonly relativePath: string; readonly keys: string[] }[];
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

class VariableCollector extends Visitor {
    public readonly variables: MessageVariables = {};

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

    private add(name: string, kind: VariableKind): void {
        this.variables[name] = merge(this.variables[name], kind);
    }
}

function variablesOf(entry: Message): MessageVariables {
    const collector = new VariableCollector();
    collector.visit(entry);
    return collector.variables;
}

function lineAt(source: string, offset: number): number {
    return source.slice(0, offset).split('\n').length;
}

class CatalogCheck {
    private readonly problems: SeedcordError[] = [];
    private readonly baseFile: string;

    public constructor(
        private readonly files: readonly LocaleFile[],
        private readonly base: string,
        private readonly dir: string
    ) {
        this.baseFile = `${base}.ftl`;
    }

    public run(): CheckedCatalog {
        const parsed = this.files.map((file) => ({ file, messages: this.parse(file) }));

        // each translation merges its variables into the base message's
        const baseMessages = parsed.find(({ file }) => file.locale === this.base)?.messages;
        if (!baseMessages) {
            this.problems.push(new SeedcordError(SeedcordErrorCode.PluginI18nBaseMissing, [this.dir, this.baseFile]));
            return { messages: {}, problems: this.problems, untranslated: [] };
        }

        const untranslated: CheckedCatalog['untranslated'][number][] = [];
        for (const { file, messages } of parsed) {
            if (file.locale === this.base) continue;
            const keys = [...baseMessages.keys()].filter((key) => !messages.has(key));
            if (keys.length > 0) untranslated.push({ relativePath: file.relativePath, keys });
            for (const [key, message] of messages) this.compare(file.relativePath, key, message, baseMessages.get(key));
        }
        const messages = Object.fromEntries(baseMessages.entries().map(([key, { variables }]) => [key, variables]));
        return { messages, problems: this.problems, untranslated };
    }

    private parse({ locale, relativePath, source }: LocaleFile): Map<string, ParsedMessage> {
        if (!isDiscordLocale(locale)) {
            this.problems.push(
                new SeedcordError(SeedcordErrorCode.PluginI18nNotALocale, [relativePath, localesLike(locale)])
            );
        }

        const messages = new Map<string, ParsedMessage>();
        for (const entry of parse(source, { withSpans: true }).body) {
            const line = lineAt(source, entry.span?.start ?? 0);
            if (entry.type === 'Junk') {
                const detail = entry.annotations.map(({ message }) => message).join(', ');
                this.problems.push(
                    new SeedcordError(SeedcordErrorCode.PluginI18nSyntax, [`${relativePath}:${line}`, detail])
                );
            } else if (entry.type === 'Message') {
                messages.set(entry.id.name, { entry, line, variables: variablesOf(entry) });
            }
        }
        return messages;
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

export function checkCatalog(files: readonly LocaleFile[], base: string, dir: string): CheckedCatalog {
    return new CatalogCheck(files, base, dir).run();
}
