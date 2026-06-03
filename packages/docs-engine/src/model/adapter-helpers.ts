import {
    ApiDeclaredItem,
    ApiDocumentedItem,
    ApiParameterListMixin,
    ApiTypeParameterListMixin,
    type ApiItem,
    type Excerpt,
    type HeritageType
} from '@microsoft/api-extractor-model';

import { referenceFromCanonical } from '@model/canonical-ref';
import { excerptToInlineType } from '@model/excerpt-renderer';
import { DocKind, frozenKindLabel } from '@model/kinds';
import { buildComment, type LinkResolver } from '@model/tsdoc-comment';
import { formatRenderedSignature } from '@transformers/signature-renderer';

import type {
    DocFlags,
    DocGroup,
    DocInheritance,
    DocNode,
    DocReference,
    DocSignature,
    DocSignatureParameter,
    InlineType,
    RenderedDeclarationHeader,
    RenderedSignature
} from '@src/types';

// First-seen kind order, not sorted: the entity-page section layout depends on it.
export function synthGroups(children: DocNode[]): DocGroup[] {
    const byKind = new Map<number, DocNode[]>();
    for (const child of children) {
        const bucket = byKind.get(child.kind) ?? [];
        bucket.push(child);
        byKind.set(child.kind, bucket);
    }
    return [...byKind.entries()].map(([kind, nodes]) => ({
        title: frozenKindLabel(kind),
        kind,
        childKeys: nodes.map((node) => node.key)
    }));
}

// Fields API Extractor exposes on concrete item subtypes but not on the `ApiItem` base. All optional,
// so `item as AeShapes` is a safe widening (no `as unknown as` needed).
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
        modifiers: modifiersOf(flags, kind)
    };

    // Methods + constructors carry their type parameters on the signature, not the header one-liner.
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

    const valueExcerpt =
        kind === DocKind.TypeAlias
            ? shapes.typeExcerpt
            : kind === DocKind.Variable
              ? shapes.variableTypeExcerpt
              : kind === DocKind.Property
                ? shapes.propertyTypeExcerpt
                : undefined;
    const valueInline = excerptToInlineType(valueExcerpt);
    if (valueInline) {
        if (kind === DocKind.TypeAlias) header.value = valueInline;
        else header.type = valueInline;
    }

    return header;
}

function declarationKeyword(kind: number, flags: DocFlags): string | null {
    switch (kind) {
        case DocKind.Class:
            return 'class';
        case DocKind.Interface:
            return 'interface';
        case DocKind.Enum:
            return 'enum';
        case DocKind.TypeAlias:
            return 'type';
        case DocKind.Function:
            return 'function';
        case DocKind.Variable:
            return flags.isConst ? 'const' : 'var';
        default:
            return null;
    }
}

function modifiersOf(flags: DocFlags, kind: number): string[] {
    const modifiers: string[] = [];
    if (flags.access) modifiers.push(flags.access);
    // A `const` variable's keyword already conveys readonly; TypeDoc doesn't double it up.
    if (flags.isReadonly && kind !== DocKind.Variable) modifiers.push('readonly');
    if (flags.isAbstract) modifiers.push('abstract');
    if (flags.isStatic) modifiers.push('static');
    if (flags.isAsync) modifiers.push('async');
    return modifiers;
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

/** A member surfaced via inheritance gets a reference to its defining class; own members get null. */
export function inheritedFromRef(item: ApiItem, owningContainer: ApiItem | undefined): DocReference | null {
    if (!owningContainer) return null;
    const parent = item.parent;
    if (!parent || parent === owningContainer || !(parent instanceof ApiDeclaredItem)) return null;
    return referenceFromCanonical(parent.canonicalReference, parent.displayName);
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
    'async'
]);

/**
 * Read the access + readonly modifiers actually written in source from the declaration excerpt.
 * TypeDoc renders only explicit modifiers (no inferred `public`, no auto-`readonly` on getters), so
 * the excerpt prefix is the source of truth, not the AE mixins.
 */
export function explicitModifiers(item: ApiItem, name: string): { access: DocFlags['access']; isReadonly: boolean } {
    if (!(item instanceof ApiDeclaredItem)) return { access: null, isReadonly: false };
    const text = item.excerptTokens[0]?.text ?? '';
    const nameIndex = text.indexOf(name);
    const prefix = nameIndex >= 0 ? text.slice(0, nameIndex) : text;
    const words = prefix.split(/\s+/).filter((word) => MODIFIER_WORDS.has(word));
    const access: DocFlags['access'] = words.includes('private')
        ? 'private'
        : words.includes('protected')
          ? 'protected'
          : words.includes('public')
            ? 'public'
            : null;
    return { access, isReadonly: words.includes('readonly') };
}

/** A getter/setter arrives as an `ApiProperty` whose excerpt begins with `get `/`set `. */
export function accessorRole(item: ApiItem): 'getter' | 'setter' | null {
    if (!(item instanceof ApiDeclaredItem)) return null;
    const first = item.excerptTokens[0]?.text ?? '';
    if (first.startsWith('get ')) return 'getter';
    if (first.startsWith('set ')) return 'setter';
    return null;
}

// API Extractor folds a get+set pair into one `get`-prefixed property and never emits the setter as
// its own item, so the only signal that a setter exists is that the accessor is not readonly
// (a get-only accessor reports isReadonly=true).
export function accessorHasSetter(item: ApiItem): boolean {
    return accessorRole(item) === 'getter' && (item as AeShapes).isReadonly === false;
}

interface SignatureBuildDeps {
    nextId: () => number;
    resolveLink: LinkResolver;
}

/** The first signature (index 0) carries the accessor's doc comment; later ones get none. */
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
        role === 'setter' ? [{ name: 'value', optional: false, ...(valueType ? { type: valueType } : {}) }] : [];
    const render: RenderedSignature = { name: [{ kind: 'text', text: owner.name }], parameters: renderParameters };
    if (role !== 'setter' && valueType) render.returnType = valueType;
    // AE gives the get + set halves one shared comment; attach it only to the first signature so a
    // get+set pair doesn't render the same summary twice.
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
        // Snapshot, not owner.flags by reference: applyAccessor sets node.flags.accessor in place,
        // so each signature keeps its own DocFlags instead of aliasing the node's.
        flags: { ...owner.flags },
        parameters,
        typeParameters: [],
        comment,
        sources: owner.sources,
        render,
        renderText: formatRenderedSignature(render),
        overwrites: null,
        inheritedFrom: null,
        implementationOf: null
    };
    if (owner.sourceUrl) signature.sourceUrl = owner.sourceUrl;
    // node.comment is nulled for accessors, so @throws must travel on the carrying signature
    // (mirrors buildSignature) or it would vanish from the rendered docs.
    const throwsTags = comment?.blockTags.filter((tag) => tag.tag === '@throws');
    if (throwsTags && throwsTags.length > 0) signature.throws = throwsTags;
    return signature;
}

/**
 * Group same-name callable overloads (TypeScript guarantees they are written adjacently) and get/set
 * accessor pairs into one logical member; everything else passes through singly.
 */
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
