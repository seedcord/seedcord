import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import Handlebars from 'handlebars';

import { inTemplateFile } from './inTemplateFile';

import type { Template, TemplateFile } from './Template';

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

// the parser also leaves hash undefined on a call without key=value pairs
function pairsOf(call: { readonly hash?: hbs.AST.Hash }): readonly hbs.AST.HashPair[] {
    return call.hash?.pairs ?? [];
}

function pathOf(expression: hbs.AST.Expression | undefined): hbs.AST.PathExpression | undefined {
    return expression?.type === 'PathExpression' ? (expression as hbs.AST.PathExpression) : undefined;
}

function fieldOf(slot: Slot, keys: readonly string[]): Slot {
    return keys.reduce((parent, key) => parent.field(key), slot);
}

class InputReader extends Handlebars.Visitor {
    public readonly root: Slot;
    private readonly scopes: Scope[];
    // a partial that calls itself would loop forever
    private readonly partialsBeingRead: string[] = [];

    constructor(
        private readonly template: Template,
        private readonly helpers: ReadonlySet<string>
    ) {
        super();
        this.root = new Slot(template.name, '');
        this.scopes = [{ slot: this.root, params: new Map() }];
    }

    /* eslint-disable @typescript-eslint/naming-convention -- Handlebars.Visitor calls each method by its node type */
    public override MustacheStatement(mustache: hbs.AST.MustacheStatement): void {
        if (ast.helperExpression(mustache)) this.readHelperCall(mustache);
        else this.accept(mustache.path);
    }

    public override SubExpression(sexpr: hbs.AST.SubExpression): void {
        this.readHelperCall(sexpr);
    }

    public override PartialStatement(partial: hbs.AST.PartialStatement): void {
        this.readPartial(partial);
    }

    public override PartialBlockStatement(partial: hbs.AST.PartialBlockStatement): void {
        this.readPartial(partial);
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

    public readFile(file: TemplateFile): void {
        this.accept(this.parse(file));
    }

    private parse(file: TemplateFile): hbs.AST.Program {
        return inTemplateFile(this.template, file, () => Handlebars.parse(file.source));
    }

    private readHelperCall(call: hbs.AST.MustacheStatement | hbs.AST.SubExpression): void {
        if (pathOf(call.path)?.original === 'lookup') {
            this.readLookup(call.params);
            return;
        }
        this.acceptArray(call.params);
        this.accept(call.hash);
    }

    private readLookup([object, key]: readonly hbs.AST.Expression[]): void {
        const objectPath = pathOf(object);
        if (key?.type !== 'StringLiteral') {
            throw new SeedcordTypeError(SeedcordErrorCode.MakeLookupDynamicKey, [
                this.template.name,
                objectPath?.original ?? 'a value'
            ]);
        }
        const field = (key as hbs.AST.StringLiteral).value;
        this.slotOf(objectPath)?.field(field).printed();
    }

    private readTest(block: hbs.AST.BlockStatement): void {
        const subject = this.subjectOf(block);
        if (subject) subject.tested();
        else this.acceptArray(block.params);
        this.accept(block.program);
    }

    private readLoop(block: hbs.AST.BlockStatement): void {
        const item = this.subjectOf(block)?.listItem() ?? this.untracedSlot();
        const [itemParam, indexParam] = blockParamsOf(block.program);
        const params = new Map<string, Slot | undefined>();
        if (itemParam) params.set(itemParam, item);
        if (indexParam) params.set(indexParam, undefined);
        this.acceptInScope(block.program, { slot: item, params });
    }

    private readWith(block: hbs.AST.BlockStatement): void {
        const target = this.subjectOf(block) ?? this.untracedSlot();
        const [asParam] = blockParamsOf(block.program);
        this.acceptInScope(block.program, { slot: target, params: new Map(asParam ? [[asParam, target]] : []) });
    }

    // handlebars runs a partial against the argument it gets, or the caller's context, plus each hash key
    private readPartial(partial: hbs.AST.PartialStatement | hbs.AST.PartialBlockStatement): void {
        const name = partial.name.type === 'PathExpression' ? partial.name.original : '';
        const file = this.template.partials.get(name);
        if (!file || this.partialsBeingRead.includes(name)) {
            this.acceptArray(partial.params);
            this.accept(partial.hash);
            return;
        }

        const context = pathOf(partial.params[0]);
        const slot = context ? this.slotOf(context) : this.scopes.at(-1)?.slot;
        const params = new Map(pairsOf(partial).map(({ key, value }) => [key, this.slotOf(pathOf(value))]));
        this.partialsBeingRead.push(name);
        this.acceptInScope(this.parse(file), { slot: slot ?? this.untracedSlot(), params });
        this.partialsBeingRead.pop();
    }

    // holds the uses of a value the reader can't trace, like the item of {{#each (someHelper)}}
    private untracedSlot(): Slot {
        return new Slot(this.template.name, '');
    }

    private acceptInScope(program: hbs.AST.Program, scope: Scope): void {
        this.scopes.push(scope);
        this.accept(program);
        this.scopes.pop();
    }

    private subjectOf(block: hbs.AST.BlockStatement): Slot | undefined {
        return this.slotOf(pathOf(block.params[0]));
    }

    private slotOf(path: hbs.AST.PathExpression | undefined): Slot | undefined {
        if (!path) return undefined;
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
    const reader = new InputReader(template, helpers);
    for (const file of template.files) reader.readFile(file);
    return reader.root.fieldShapes();
}
