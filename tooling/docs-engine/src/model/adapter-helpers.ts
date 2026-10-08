import {
    ApiAbstractMixin,
    ApiDeclaredItem,
    ApiDocumentedItem,
    ApiItemKind,
    ApiParameterListMixin,
    ApiTypeParameterListMixin,
    type ApiItem,
    type Excerpt,
    type HeritageType
} from '@microsoft/api-extractor-model';

import { referenceFromCanonical } from '#model/canonical-ref';
import { excerptToInlineType } from '#model/excerpt-renderer';
import { DocKind, frozenKindLabel } from '#model/kinds';
import { memberModifiers } from '#model/modifiers';
import { buildComment, type LinkResolver } from '#model/tsdoc-comment';
import { formatRenderedSignature } from '#transformers/signature-renderer';

import type {
    DocFlags,
    DocGroup,
    DocInheritance,
    DocManifestPackage,
    DocNode,
    DocReference,
    DocSignature,
    DocSignatureParameter,
    DocSource,
    InlineType,
    PackageSourceIndex,
    ReexportReference,
    RenderedDeclarationHeader,
    RenderedSignature
} from '#src/types';

// the entity page lays out sections in this first-seen kind order
export function synthGroups(children: DocNode[]): DocGroup[] {
    const byKind = Map.groupBy(children, (child) => child.kind);
    return [...byKind.entries()].map(([kind, nodes]) => ({
        title: frozenKindLabel(kind),
        kind,
        childKeys: nodes.map((node) => node.key)
    }));
}

// api extractor declares these on concrete item subtypes only. reading them off an ApiItem takes a
// cast, and every field being optional keeps that cast safe.
export interface AeShapes {
    extendsType?: HeritageType;
    extendsTypes?: readonly HeritageType[];
    implementsTypes?: readonly HeritageType[];
    typeExcerpt?: Excerpt;
    variableTypeExcerpt?: Excerpt;
    propertyTypeExcerpt?: Excerpt;
    isReadonly?: boolean;
}

export function buildDeclarationHeader(
    item: ApiItem,
    name: string,
    kind: number,
    flags: DocFlags
): RenderedDeclarationHeader {
    const shapes = item as AeShapes;
    const header: RenderedDeclarationHeader = {
        name,
        keyword: declarationKeyword(kind, flags),
        modifiers: memberModifiers(flags, kind)
    };

    // method and ctor type params render on the signature
    const headerHasTypeParams = kind !== DocKind.Method && kind !== DocKind.Constructor;
    if (headerHasTypeParams && ApiTypeParameterListMixin.isBaseClassOf(item) && item.typeParameters.length > 0) {
        header.typeParams = item.typeParameters.map((tp) => {
            const entry: { name: string; constraint?: InlineType; default?: InlineType } = { name: tp.name };
            const constraint = excerptToInlineType(tp.constraintExcerpt);
            const def = excerptToInlineType(tp.defaultTypeExcerpt);
            if (constraint) entry.constraint = constraint;
            if (def) entry.default = def;
            return entry;
        });
    }

    const extendsList = shapes.extendsType ? [shapes.extendsType] : shapes.extendsTypes;
    const extendsInline = heritageInline(extendsList);
    const implementsInline = heritageInline(shapes.implementsTypes);
    if (extendsInline || implementsInline) {
        header.heritage = {};
        if (extendsInline) header.heritage.extends = extendsInline;
        if (implementsInline) header.heritage.implements = implementsInline;
    }

    const valueInline = excerptToInlineType(valueExcerptOf(shapes, kind));
    if (valueInline) {
        if (kind === DocKind.TypeAlias) header.value = valueInline;
        else header.type = valueInline;
    }

    return header;
}

function valueExcerptOf(shapes: AeShapes, kind: number): Excerpt | undefined {
    switch (kind) {
        case DocKind.TypeAlias: {
            return shapes.typeExcerpt;
        }
        case DocKind.Variable: {
            return shapes.variableTypeExcerpt;
        }
        case DocKind.Property: {
            return shapes.propertyTypeExcerpt;
        }
        default: {
            return undefined;
        }
    }
}

function declarationKeyword(kind: number, flags: DocFlags): string | null {
    switch (kind) {
        case DocKind.Class: {
            return 'class';
        }
        case DocKind.Interface: {
            return 'interface';
        }
        case DocKind.Enum: {
            return 'enum';
        }
        case DocKind.TypeAlias: {
            return 'type';
        }
        case DocKind.Function: {
            return 'function';
        }
        case DocKind.Variable: {
            return flags.isConst ? 'const' : 'var';
        }
        default: {
            return null;
        }
    }
}

export function emptyInheritance(): DocInheritance {
    return { extends: [], implements: [], extendedBy: [], implementedBy: [] };
}

export function paramFlags(isOptional: boolean): DocFlags {
    return {
        access: null,
        accessor: null,
        isStatic: false,
        isAbstract: false,
        isConst: false,
        isReadonly: false,
        isOptional,
        isAsync: false,
        isDeprecated: false,
        isInherited: false,
        isDecorator: false,
        isInternal: false,
        isExternal: false,
        isOverwriting: false
    };
}

function heritageInline(types: readonly HeritageType[] | undefined): InlineType[] | undefined {
    if (!types || types.length === 0) return undefined;
    const rendered = types
        .map((entry) => excerptToInlineType(entry.excerpt))
        .filter((entry): entry is InlineType => Boolean(entry));
    return rendered.length > 0 ? rendered : undefined;
}

export function reexportReferences(manifest: DocManifestPackage): ReexportReference[] {
    return (manifest.reexports ?? []).map((entry) => ({
        name: entry.name,
        qualifiedName: entry.name,
        packageName: entry.owner
    }));
}

export function inheritedFromRef(item: ApiItem, owningContainer: ApiItem | undefined): DocReference | null {
    if (!owningContainer) return null;
    const parent = item.parent;
    if (!parent || parent === owningContainer || !(parent instanceof ApiDeclaredItem)) return null;
    return referenceFromCanonical(parent.canonicalReference, parent.displayName);
}

// own row first. api extractor leaves an `@internal` override out and reports the member as inherited.
export function sourcesIn(table: PackageSourceIndex, ownRow: string, baseRow: string | undefined): DocSource[] {
    const entries = table[ownRow] ?? (baseRow === undefined ? undefined : table[baseRow]);
    return (entries ?? []).map((entry) => ({
        fileName: entry.file,
        line: entry.line,
        character: entry.column,
        ...(entry.url && { url: entry.url })
    }));
}

// a base class from another package has no row in this package's source table
export function baseRowName(
    memberName: string,
    inheritedFrom: DocReference | null,
    packageName: string
): string | undefined {
    if (inheritedFrom?.packageName !== packageName || !inheritedFrom.qualifiedName) return undefined;
    return `${inheritedFrom.qualifiedName}.${memberName}`;
}

const MODIFIER_WORDS = new Set([
    'public',
    'protected',
    'private',
    'readonly',
    'static',
    'abstract',
    'get',
    'set',
    'declare',
    'override',
    'accessor',
    'async'
]);

interface ExplicitModifiers {
    access: DocFlags['access'];
    isReadonly: boolean;
    isAutoAccessor: boolean;
}

// the AE mixins also report inferred modifiers, like `readonly` on a get-only accessor
export function explicitModifiers(item: ApiItem): ExplicitModifiers {
    if (!(item instanceof ApiDeclaredItem)) return { access: null, isReadonly: false, isAutoAccessor: false };
    const words = new Set<string>();
    for (const word of (item.excerptTokens[0]?.text ?? '').trim().split(/\s+/)) {
        if (!MODIFIER_WORDS.has(word)) break;
        words.add(word);
    }
    const access: DocFlags['access'] = words.has('private')
        ? 'private'
        : words.has('protected')
          ? 'protected'
          : words.has('public')
            ? 'public'
            : null;
    return {
        access,
        isReadonly: words.has('readonly'),
        isAutoAccessor: words.has('accessor')
    };
}

// typescript rejects `async` on an abstract method or an interface member
export function hasBody(item: ApiItem): boolean {
    if (item.kind === ApiItemKind.Function) return true;
    return item.kind === ApiItemKind.Method && !(ApiAbstractMixin.isBaseClassOf(item) && item.isAbstract);
}

// AE emits an accessor as an ApiProperty whose excerpt starts with `get ` or `set `
export function accessorRole(item: ApiItem): 'getter' | 'setter' | null {
    if (!(item instanceof ApiDeclaredItem)) return null;
    const first = item.excerptTokens[0]?.text ?? '';
    if (first.startsWith('get ')) return 'getter';
    if (first.startsWith('set ')) return 'setter';
    return null;
}

// AE folds a get+set pair into one `get` property and never emits the setter, so a non-readonly
// accessor is the only sign a setter exists (a get-only accessor reports isReadonly=true).
export function accessorHasSetter(item: ApiItem): boolean {
    return accessorRole(item) === 'getter' && (item as AeShapes).isReadonly === false;
}

interface SignatureBuildDeps {
    nextId: () => number;
    resolveLink: LinkResolver;
}

export function buildAccessorSignature(
    item: ApiItem,
    owner: DocNode,
    role: 'getter' | 'setter',
    index: number,
    deps: SignatureBuildDeps
): DocSignature {
    const { nextId, resolveLink } = deps;
    const sigKind = role === 'setter' ? DocKind.SetSignature : DocKind.GetSignature;
    const valueType = excerptToInlineType((item as AeShapes).propertyTypeExcerpt);
    const parameters: DocSignatureParameter[] =
        role === 'setter' ? [{ id: 0, name: 'value', kind: DocKind.Parameter, flags: paramFlags(false) }] : [];
    const renderParameters: RenderedSignature['parameters'] =
        role === 'setter' ? [{ name: 'value', optional: false, ...(valueType && { type: valueType }) }] : [];
    const render: RenderedSignature = { name: [{ kind: 'text', text: owner.name }], parameters: renderParameters };
    if (role !== 'setter' && valueType) render.returnType = valueType;
    // AE gives get and set one shared comment
    const comment =
        index === 0 && item instanceof ApiDocumentedItem ? buildComment(item.tsdocComment, resolveLink) : null;
    const signature: DocSignature = {
        id: nextId(),
        name: owner.name,
        kind: sigKind,
        fragment: '',
        anchor: '',
        overloadIndex: index,
        kindLabel: frozenKindLabel(sigKind),
        // snapshot, applyAccessor mutates node.flags
        flags: { ...owner.flags },
        parameters,
        typeParameters: [],
        comment,
        sources: owner.sources,
        render,
        renderText: formatRenderedSignature(render, owner.flags.isOptional),
        overwrites: null,
        inheritedFrom: null,
        implementationOf: null
    };
    if (owner.sourceUrl) signature.sourceUrl = owner.sourceUrl;
    // applyAccessor nulls node.comment, so @throws only reaches the page on the signature
    const throwsTags = comment?.blockTags.filter((tag) => tag.tag === '@throws');
    if (throwsTags && throwsTags.length > 0) signature.throws = throwsTags;
    return signature;
}

// AE reports the keys of an inline object type in a class's type parameters or heritage clause as
// class members. `class C<T extends { id: string }>` gets an `id` property.
const NEVER_IN_A_CLASS_BODY = new Set<ApiItemKind>([
    ApiItemKind.PropertySignature,
    ApiItemKind.MethodSignature,
    ApiItemKind.CallSignature,
    ApiItemKind.ConstructSignature
]);

export function belongsInClassBody(item: ApiItem): boolean {
    return !NEVER_IN_A_CLASS_BODY.has(item.kind);
}

// api extractor writes enum members alphabetically. the manifest keeps each one's source line
export function enumMembersInOrder(nodes: DocNode[], container: ApiItem | undefined): DocNode[] {
    if (container?.kind !== ApiItemKind.Enum) return nodes;
    return nodes.toSorted((a, b) => (a.sources[0]?.line ?? 0) - (b.sources[0]?.line ?? 0));
}

// TS requires same-name overloads be written adjacently
export function groupOverloads(members: readonly ApiItem[]): ApiItem[][] {
    const groups: ApiItem[][] = [];
    const indexByKey = new Map<string, number>();
    for (const member of members) {
        const callable = ApiParameterListMixin.isBaseClassOf(member) || accessorRole(member) !== null;
        const groupKey = `${member.kind}:${member.displayName}`;
        const existing = indexByKey.get(groupKey);
        if (callable && existing !== undefined) {
            groups[existing]?.push(member);
            continue;
        }
        indexByKey.set(groupKey, groups.length);
        groups.push([member]);
    }
    return groups;
}
