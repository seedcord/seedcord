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
        this.become('text');
    }

    public tested(): void {
        this.kind ??= 'bool';
    }

    public listItem(): Slot {
        this.become('list');
        this.item ??= new Slot(this.template, this.path);
        return this.item;
    }

    public field(key: string): Slot {
        this.become('object');
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

    // {{#if x}} only checks that x has an answer, so a tested value can still take any shape
    private become(kind: Exclude<InputShape['kind'], 'bool'>): void {
        if (this.kind !== undefined && this.kind !== 'bool' && this.kind !== kind) {
            throw new SeedcordTypeError(SeedcordErrorCode.MakeValueUsedTwoWays, [
                this.template,
                this.path,
                this.kind,
                kind
            ]);
        }
        this.kind = kind;
    }
}

interface Scope {
    readonly slot: Slot;
    // block params from `as |item index|`
    readonly params: ReadonlyMap<string, Slot>;
    // a partial's hash values. handlebars sets them on the
    // partial's context and leaves out the caller's block params
    readonly fields?: ReadonlyMap<string, Slot>;
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

function lookUp(names: ReadonlyMap<string, Slot> | undefined, [head, ...rest]: readonly string[]): Slot | undefined {
    const named = head === undefined ? undefined : names?.get(head);
    return named && fieldOf(named, rest);
}

class InputReader extends Handlebars.Visitor {
    private readonly root: Slot;
    private readonly scopes: Scope[];
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

    public read(): TemplateInputs {
        for (const file of this.template.files) this.accept(this.parse(file));
        return this.root.fieldShapes();
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
                objectPath?.original ?? 'its value'
            ]);
        }
        const field = (key as hbs.AST.StringLiteral).value;
        this.slotOf(objectPath)?.field(field).printed();
    }

    private readTest(block: hbs.AST.BlockStatement): void {
        this.slotOrRead(block.params[0])?.tested();
        this.accept(block.program);
    }

    private readLoop(block: hbs.AST.BlockStatement): void {
        const item = this.slotOrRead(block.params[0])?.listItem() ?? this.untracedSlot();
        const [itemParam, indexParam] = blockParamsOf(block.program);
        const params = new Map<string, Slot>();
        if (itemParam) params.set(itemParam, item);
        if (indexParam) params.set(indexParam, this.untracedSlot());
        this.acceptInScope(block.program, { slot: item, params });
    }

    private readWith(block: hbs.AST.BlockStatement): void {
        const target = this.slotOrRead(block.params[0]) ?? this.untracedSlot();
        const [asParam] = blockParamsOf(block.program);
        this.acceptInScope(block.program, { slot: target, params: new Map(asParam ? [[asParam, target]] : []) });
    }

    // handlebars runs a partial against the argument it gets, or the caller's context, plus each hash key
    private readPartial(partial: hbs.AST.PartialStatement | hbs.AST.PartialBlockStatement): void {
        const name = pathOf(partial.name)?.original;
        const file = name === undefined ? undefined : this.template.partials.get(name);
        if (name === undefined || !file) {
            this.acceptArray(partial.params);
            this.accept(partial.hash);
            return;
        }
        if (this.partialsBeingRead.includes(name)) {
            throw new SeedcordTypeError(SeedcordErrorCode.MakePartialCallsItself, [this.template.name, name]);
        }

        const [context] = partial.params;
        const slot = context ? this.slotOrRead(context) : this.scopes.at(-1)?.slot;
        const fields = new Map(
            pairsOf(partial).map(({ key, value }) => [key, this.slotOrRead(value) ?? this.untracedSlot()])
        );
        this.partialsBeingRead.push(name);
        this.acceptInScope(this.parse(file), { slot: slot ?? this.untracedSlot(), params: new Map(), fields });
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

    // (split csv) has no slot of its own. reading it still asks for csv
    private slotOrRead(expression: hbs.AST.Expression | undefined): Slot | undefined {
        const slot = this.slotOf(pathOf(expression));
        if (!slot && expression) this.accept(expression);
        return slot;
    }

    private scopeDeclaring(param: string): Scope | undefined {
        for (const scope of this.scopes.toReversed()) {
            if (scope.params.has(param)) return scope;
            if (scope.fields) return undefined;
        }
        return undefined;
    }

    private slotOf(path: hbs.AST.PathExpression | undefined): Slot | undefined {
        if (!path) return undefined;
        if (path.data) return path.parts[0] === 'root' ? fieldOf(this.root, path.parts.slice(1)) : undefined;
        if (ast.simpleId(path) && this.helpers.has(path.original)) return undefined;

        const [head] = path.parts;
        const declared =
            head !== undefined && path.depth === 0 && !ast.scopedId(path) ? this.scopeDeclaring(head) : undefined;
        if (declared) return lookUp(declared.params, path.parts);

        const scope = this.scopes.at(-1 - path.depth);
        return scope && (lookUp(scope.fields, path.parts) ?? fieldOf(scope.slot, path.parts));
    }
}

export function inputsOf(template: Template, helpers: ReadonlySet<string>): TemplateInputs {
    return new InputReader(template, helpers).read();
}
