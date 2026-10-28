import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import Handlebars from 'handlebars';

import type { Template } from './Template';

export type InputShape =
    | { readonly kind: 'text' }
    | { readonly kind: 'bool' }
    | { readonly kind: 'list'; readonly item: InputShape }
    | { readonly kind: 'object'; readonly fields: TemplateInputs };

export type TemplateInputs = Readonly<Record<string, InputShape>>;

// every way the templates use one value. its shape comes out once every file is read
class Slot {
    private kind: InputShape['kind'] | undefined;
    private item: Slot | undefined;
    private readonly fields = new Map<string, Slot>();

    constructor(
        private readonly template: string,
        private readonly path: string
    ) {}

    public printed(): void {
        if (this.kind === undefined || this.kind === 'bool') this.kind = 'text';
    }

    public tested(): void {
        this.kind ??= 'bool';
    }

    public listItem(): Slot {
        this.becomeOneOf('list', 'object');
        this.item ??= new Slot(this.template, this.path);
        return this.item;
    }

    public field(key: string): Slot {
        this.becomeOneOf('object', 'list');
        const existing = this.fields.get(key);
        if (existing) return existing;
        const created = new Slot(this.template, this.path === '' ? key : `${this.path}.${key}`);
        this.fields.set(key, created);
        return created;
    }

    public fieldShapes(): TemplateInputs {
        return Object.fromEntries([...this.fields].map(([key, slot]) => [key, slot.shape()]));
    }

    private shape(): InputShape {
        if (this.kind === 'list') return { kind: 'list', item: this.item?.shape() ?? { kind: 'text' } };
        if (this.kind === 'object') return { kind: 'object', fields: this.fieldShapes() };
        return { kind: this.kind ?? 'text' };
    }

    private becomeOneOf(kind: 'list' | 'object', other: 'list' | 'object'): void {
        if (this.kind === other) {
            throw new SeedcordTypeError(SeedcordErrorCode.MakeValueUsedTwoWays, [this.template, this.path]);
        }
        this.kind = kind;
    }
}

interface Scope {
    readonly slot: Slot;
    // block params from `as |item index|`. the index holds no value to ask for
    readonly params: ReadonlyMap<string, Slot | undefined>;
}

// handlebars' types call it scopeId. the function on the object is scopedId
const ast = Handlebars.AST.helpers as typeof Handlebars.AST.helpers & {
    scopedId: (path: hbs.AST.PathExpression) => boolean;
};

// the parser leaves blockParams undefined on a block without `as |x|`, whatever the types say
type ParsedProgram = Omit<hbs.AST.Program, 'blockParams'> & { readonly blockParams?: readonly string[] };

function blockParamsOf(program: ParsedProgram): readonly string[] {
    return program.blockParams ?? [];
}

function fieldOf(slot: Slot, keys: readonly string[]): Slot {
    return keys.reduce((parent, key) => parent.field(key), slot);
}

class InputReader extends Handlebars.Visitor {
    public readonly root: Slot;
    private readonly scopes: Scope[];

    constructor(
        private readonly template: string,
        private readonly helpers: ReadonlySet<string>
    ) {
        super();
        this.root = new Slot(template, '');
        this.scopes = [{ slot: this.root, params: new Map() }];
    }

    /* eslint-disable @typescript-eslint/naming-convention -- Handlebars.Visitor calls each method by its node type */
    public override MustacheStatement(mustache: hbs.AST.MustacheStatement): void {
        if (!ast.helperExpression(mustache)) {
            this.accept(mustache.path);
            return;
        }
        this.acceptArray(mustache.params);
        this.accept(mustache.hash);
    }

    public override SubExpression(sexpr: hbs.AST.SubExpression): void {
        this.acceptArray(sexpr.params);
        this.accept(sexpr.hash);
    }

    public override PartialStatement(partial: hbs.AST.PartialStatement): void {
        this.acceptArray(partial.params);
        this.accept(partial.hash);
    }

    public override PartialBlockStatement(partial: hbs.AST.PartialBlockStatement): void {
        this.acceptArray(partial.params);
        this.accept(partial.hash);
        this.accept(partial.program);
    }

    public override PathExpression(path: hbs.AST.PathExpression): void {
        this.slotOf(path)?.printed();
    }

    public override BlockStatement(block: hbs.AST.BlockStatement): void {
        switch (block.path.original) {
            case 'if':
            case 'unless': {
                this.readTest(block);
                break;
            }
            case 'each': {
                this.readLoop(block);
                break;
            }
            case 'with': {
                this.readWith(block);
                break;
            }
            default: {
                this.acceptArray(block.params);
                this.accept(block.hash);
                this.accept(block.program);
            }
        }
        this.accept(block.inverse);
    }
    /* eslint-enable @typescript-eslint/naming-convention */

    private readTest(block: hbs.AST.BlockStatement): void {
        const subject = this.subjectOf(block);
        if (subject) subject.tested();
        else this.acceptArray(block.params);
        this.accept(block.program);
    }

    private readLoop(block: hbs.AST.BlockStatement): void {
        const item = this.subjectOf(block)?.listItem() ?? new Slot(this.template, '');
        const [itemParam, indexParam] = blockParamsOf(block.program);
        const params = new Map<string, Slot | undefined>();
        if (itemParam) params.set(itemParam, item);
        if (indexParam) params.set(indexParam, undefined);
        this.acceptInScope(block.program, { slot: item, params });
    }

    private readWith(block: hbs.AST.BlockStatement): void {
        const target = this.subjectOf(block) ?? new Slot(this.template, '');
        const [asParam] = blockParamsOf(block.program);
        this.acceptInScope(block.program, { slot: target, params: new Map(asParam ? [[asParam, target]] : []) });
    }

    private acceptInScope(program: hbs.AST.Program, scope: Scope): void {
        this.scopes.push(scope);
        this.accept(program);
        this.scopes.pop();
    }

    private subjectOf(block: hbs.AST.BlockStatement): Slot | undefined {
        const [subject] = block.params;
        return subject?.type === 'PathExpression' ? this.slotOf(subject as hbs.AST.PathExpression) : undefined;
    }

    private slotOf(path: hbs.AST.PathExpression): Slot | undefined {
        if (path.data) return path.parts[0] === 'root' ? fieldOf(this.root, path.parts.slice(1)) : undefined;
        if (ast.simpleId(path) && this.helpers.has(path.original)) return undefined;

        const [head, ...rest] = path.parts;
        if (head !== undefined && path.depth === 0 && !ast.scopedId(path)) {
            const declared = this.scopes.findLast((scope) => scope.params.has(head));
            if (declared) {
                const param = declared.params.get(head);
                return param && fieldOf(param, rest);
            }
        }
        const scope = this.scopes.at(-1 - path.depth);
        return scope && fieldOf(scope.slot, path.parts);
    }
}

export function inputsOf(template: Template, helpers: ReadonlySet<string>): TemplateInputs {
    const reader = new InputReader(template.name, helpers);
    for (const file of template.files) reader.accept(Handlebars.parse(file.source));
    return reader.root.fieldShapes();
}
