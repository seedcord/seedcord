import { toGlobalId } from '../ids';

import type { DocReference, DocType, InlineType, SigPart } from '../types';
import type { TransformContext } from './transform-context';
import type { JSONOutput } from 'typedoc';

type TypeRenderer = (ctx: TransformContext, type: DocType, parts: SigPart[]) => void;

export const textPart = (text: string): SigPart => ({ kind: 'text', text });
const punctPart = (text: string): SigPart => ({ kind: 'punct', text });
const spacePart = (): SigPart => ({ kind: 'space' });

interface ReferenceLike {
    name?: string;
    target?: number | string | { qualifiedName?: string; package?: string; packageName?: string };
    package?: string;
    packageName?: string;
    qualifiedName?: string;
    externalUrl?: string;
    url?: string;
}

const literalToText = (value: unknown): string => {
    switch (typeof value) {
        case 'string':
            return JSON.stringify(value);
        case 'number':
        case 'boolean':
            return String(value);
        case 'undefined':
            return 'undefined';
        default:
            return value === null ? 'null' : 'unknown';
    }
};

const getReferenceName = (ref: ReferenceLike): string | undefined =>
    typeof ref.name === 'string' && ref.name.length > 0 ? ref.name : undefined;

const resolvePackageName = (ctx: TransformContext, ref: ReferenceLike): string | undefined => {
    if (typeof ref.packageName === 'string' && ref.packageName.length > 0) return ref.packageName;
    if (typeof ref.package === 'string' && ref.package.length > 0) return ref.package;
    return ctx.manifest.name;
};

const resolveExternalUrl = (ref: ReferenceLike): string | undefined => {
    if (typeof ref.externalUrl === 'string' && ref.externalUrl.length > 0) return ref.externalUrl;
    if (typeof ref.url === 'string' && ref.url.length > 0) return ref.url;
    return undefined;
};

const applyQualifiedName = (ref: ReferenceLike, reference: DocReference): void => {
    if (typeof ref.qualifiedName === 'string' && ref.qualifiedName.length > 0) {
        reference.qualifiedName = ref.qualifiedName;
    }
};

const applyTargetMetadata = (ctx: TransformContext, ref: ReferenceLike, reference: DocReference): void => {
    const target = ref.target;
    if (typeof target === 'number') {
        reference.targetKey = toGlobalId(reference.packageName ?? ctx.manifest.name, target);
        return;
    }
    if (typeof target === 'string') {
        if (target.length > 0 && !reference.qualifiedName) {
            reference.qualifiedName = target;
        }
        return;
    }
    if (!target || typeof target !== 'object') {
        return;
    }
    const maybeQualified = (target as { qualifiedName?: string }).qualifiedName;
    if (maybeQualified && maybeQualified.length > 0 && !reference.qualifiedName) {
        reference.qualifiedName = maybeQualified;
    }
    const maybePackage = (target as { packageName?: string }).packageName ?? (target as { package?: string }).package;
    if (maybePackage && maybePackage.length > 0) {
        reference.packageName = maybePackage;
    }
};

const buildReference = (ctx: TransformContext, ref: ReferenceLike): DocReference | undefined => {
    const name = getReferenceName(ref);
    if (!name) {
        return undefined;
    }

    const reference: DocReference = { name };
    const pkg = resolvePackageName(ctx, ref);
    if (pkg) {
        reference.packageName = pkg;
    }

    applyQualifiedName(ref, reference);

    const externalUrl = resolveExternalUrl(ref);
    if (externalUrl) {
        reference.externalUrl = externalUrl;
    }

    applyTargetMetadata(ctx, ref, reference);

    return reference;
};

const renderReferenceType: TypeRenderer = (ctx, type, parts) => {
    const referenceType = type as JSONOutput.ReferenceType;
    let label = 'unknown';
    if (typeof referenceType.name === 'string' && referenceType.name.length > 0) {
        label = referenceType.name;
    }
    if (
        label === 'unknown' &&
        typeof referenceType.qualifiedName === 'string' &&
        referenceType.qualifiedName.length > 0
    ) {
        label = referenceType.qualifiedName;
    }

    const reference = buildReference(ctx, referenceType);
    if (reference) {
        parts.push({ kind: 'ref', text: label, ref: reference });
    } else {
        parts.push(textPart(label));
    }

    const typeArguments = (referenceType.typeArguments ?? []) as DocType[];
    if (typeArguments.length === 0) {
        return;
    }

    parts.push(punctPart('<'));
    typeArguments.forEach((argument: DocType, index: number) => {
        if (index > 0) {
            parts.push(punctPart(', '));
        }
        renderTypeNode(ctx, argument, parts);
    });
    parts.push(punctPart('>'));
};

const renderSeparatedTypes = (
    ctx: TransformContext,
    nodes: readonly DocType[],
    separator: string,
    parts: SigPart[]
): void => {
    nodes.forEach((entry, index) => {
        if (index > 0) {
            parts.push(punctPart(separator));
        }
        renderTypeNode(ctx, entry, parts);
    });
};

const renderTupleType: TypeRenderer = (ctx, type, parts) => {
    parts.push(punctPart('['));
    const elements = (type as JSONOutput.TupleType).elements ?? [];
    elements.forEach((element, index) => {
        if (index > 0) parts.push(punctPart(', '));
        if (element.type === 'namedTupleMember') {
            parts.push(textPart(element.name));
            if (element.isOptional) parts.push(punctPart('?'));
            parts.push(punctPart(': '));
            renderTypeNode(ctx, element.element as DocType, parts);
            return;
        }
        if (element.type === 'optional') {
            renderTypeNode(ctx, element.elementType as DocType, parts);
            parts.push(punctPart('?'));
            return;
        }
        if (element.type === 'rest') {
            parts.push(punctPart('...'));
            renderTypeNode(ctx, element.elementType as DocType, parts);
            return;
        }
        renderTypeNode(ctx, element as DocType, parts);
    });
    parts.push(punctPart(']'));
};

const renderConditionalType: TypeRenderer = (ctx, type, parts) => {
    const conditional = type as JSONOutput.ConditionalType;
    renderTypeNode(ctx, conditional.checkType, parts);
    parts.push(spacePart());
    parts.push(textPart('extends'));
    parts.push(spacePart());
    renderTypeNode(ctx, conditional.extendsType, parts);
    parts.push(spacePart());
    parts.push(punctPart('? '));
    renderTypeNode(ctx, conditional.trueType, parts);
    parts.push(spacePart());
    parts.push(punctPart(': '));
    renderTypeNode(ctx, conditional.falseType, parts);
};

const renderTemplateLiteralType: TypeRenderer = (ctx, type, parts) => {
    const template = type as JSONOutput.TemplateLiteralType;
    const spans = (template as { spans?: JSONOutput.SomeType[] }).spans ?? [];
    const tails = Array.isArray(template.tail) ? template.tail : [];

    parts.push(punctPart('`'));
    if (typeof template.head === 'string' && template.head.length > 0) {
        parts.push(textPart(template.head));
    }

    tails.forEach((segment, index) => {
        const tuple = Array.isArray(segment) ? segment : [spans[index] ?? null, segment];
        const segmentType = tuple[0];
        const segmentText = tuple[1];

        parts.push(punctPart('${'));
        if (segmentType) {
            renderTypeNode(ctx, segmentType, parts);
        }
        parts.push(punctPart('}'));

        if (typeof segmentText === 'string' && segmentText.length > 0) {
            parts.push(textPart(segmentText));
        }
    });

    parts.push(punctPart('`'));
};

const renderReflectionType: TypeRenderer = (ctx, type, parts) => {
    const reflection = type as JSONOutput.ReflectionType;
    const signatures = Array.isArray(reflection.declaration.signatures) ? reflection.declaration.signatures : [];
    if (signatures.length === 0) {
        parts.push(textPart('{…}'));
        return;
    }
    const signature = signatures[0];
    if (!signature) {
        parts.push(textPart('{…}'));
        return;
    }

    parts.push(punctPart('('));
    (signature.parameters ?? []).forEach((parameter, index) => {
        if (index > 0) parts.push(punctPart(', '));
        parts.push(textPart(parameter.name));
        if (parameter.flags.isOptional) {
            parts.push(punctPart('?'));
        }
        if (parameter.type) {
            parts.push(punctPart(': '));
            renderTypeNode(ctx, parameter.type, parts);
        }
    });
    parts.push(punctPart(') => '));
    if (signature.type) {
        renderTypeNode(ctx, signature.type, parts);
    }
};

const TYPE_RENDERERS: Record<string, TypeRenderer> = {
    intrinsic: (_ctx, type, parts) => parts.push(textPart((type as JSONOutput.IntrinsicType).name)),
    literal: (_ctx, type, parts) => parts.push(textPart(literalToText((type as JSONOutput.LiteralType).value))),
    reference: renderReferenceType,
    array: (ctx, type, parts) => {
        const arrayType = type as JSONOutput.ArrayType;
        renderTypeNode(ctx, arrayType.elementType, parts);
        parts.push(punctPart('[]'));
    },
    union: (ctx, type, parts) => {
        renderSeparatedTypes(ctx, (type as JSONOutput.UnionType).types as DocType[], ' | ', parts);
    },
    intersection: (ctx, type, parts) => {
        renderSeparatedTypes(ctx, (type as JSONOutput.IntersectionType).types as DocType[], ' & ', parts);
    },
    tuple: renderTupleType,
    conditional: renderConditionalType,
    templateLiteral: renderTemplateLiteralType,
    reflection: renderReflectionType,
    typeOperator: (ctx, type, parts) => {
        const operator = type as JSONOutput.TypeOperatorType;
        parts.push(textPart(operator.operator));
        parts.push(spacePart());
        renderTypeNode(ctx, operator.target, parts);
    },
    indexedAccess: (ctx, type, parts) => {
        const indexed = type as JSONOutput.IndexedAccessType;
        renderTypeNode(ctx, indexed.objectType, parts);
        parts.push(punctPart('['));
        renderTypeNode(ctx, indexed.indexType, parts);
        parts.push(punctPart(']'));
    },
    query: (ctx, type, parts) => {
        const query = type as JSONOutput.QueryType;
        parts.push(textPart('typeof'));
        parts.push(spacePart());
        renderTypeNode(ctx, query.queryType, parts);
    },
    optional: (ctx, type, parts) => {
        const optional = type as JSONOutput.OptionalType;
        renderTypeNode(ctx, optional.elementType, parts);
        parts.push(punctPart('?'));
    },
    rest: (ctx, type, parts) => {
        const rest = type as JSONOutput.RestType;
        parts.push(punctPart('...'));
        renderTypeNode(ctx, rest.elementType, parts);
    },
    predicate: (ctx, type, parts) => {
        const predicate = type as JSONOutput.PredicateType;
        if (predicate.asserts) {
            parts.push(textPart('asserts'));
            parts.push(spacePart());
        }
        if (predicate.name) {
            parts.push(textPart(predicate.name));
        }
        if (predicate.targetType) {
            parts.push(spacePart());
            parts.push(textPart('is'));
            parts.push(spacePart());
            renderTypeNode(ctx, predicate.targetType, parts);
        }
    }
};

const renderTypeNode = (ctx: TransformContext, type: DocType, parts: SigPart[]): void => {
    const renderer = TYPE_RENDERERS[type.type];
    if (renderer) {
        renderer(ctx, type, parts);
        return;
    }
    const label = typeof type.type === 'string' && type.type.length > 0 ? type.type : 'unknown';
    parts.push(textPart(label));
};

export const renderInlineType = (ctx: TransformContext, type?: DocType | null): InlineType | undefined => {
    if (!type) {
        return undefined;
    }

    const parts: SigPart[] = [];
    renderTypeNode(ctx, type, parts);

    if (parts.length === 0) {
        return undefined;
    }

    return { parts };
};
