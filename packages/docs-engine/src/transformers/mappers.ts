import { toGlobalId, type GlobalId } from '../ids';
import { kindLabel } from '../kinds';
import { mapFlags } from './flag-mapper';
import { formatRenderedSignature, renderSignatureView } from './signature-renderer';
import { typeToken, toDocType } from './type-helpers';

import type {
    DocComment,
    DocCommentBlockTag,
    DocGroup,
    DocReference,
    DocSignature,
    DocSignatureParameter,
    DocSource,
    DocType,
    DocTypeParameter,
    DocInheritance
} from '../types';
import type { TransformContext } from './transform-context';
import type {
    Comment,
    DeclarationReflection,
    ParameterReflection,
    ReflectionGroup,
    ReflectionKind,
    ReflectionType,
    SignatureReflection,
    SomeType,
    SourceReference,
    TypeParameterReflection
} from 'typedoc';

interface ReferenceCandidate {
    name?: string;
    packageName?: string;
    package?: string;
    qualifiedName?: string;
    target?: number | string | null;
    id?: number;
    externalUrl?: string;
    url?: string;
    sources?: { url?: string }[];
}
const selectPackageName = (candidate: ReferenceCandidate, fallback: string): string | undefined => {
    const pkg = candidate.packageName ?? candidate.package;
    if (typeof pkg === 'string' && pkg.length > 0) {
        return pkg;
    }
    return fallback.length > 0 ? fallback : undefined;
};
const pickReferenceUrl = (candidate: ReferenceCandidate): string | undefined => {
    if (candidate.externalUrl && candidate.externalUrl.length > 0) {
        return candidate.externalUrl;
    }

    if (candidate.url && candidate.url.length > 0) {
        return candidate.url;
    }

    if (Array.isArray(candidate.sources)) {
        const found = candidate.sources.find((source) => typeof source.url === 'string' && source.url.length > 0);
        if (found?.url) {
            return found.url;
        }
    }

    return undefined;
};
const pickReferenceTarget = (candidate: ReferenceCandidate): number | undefined => {
    if (typeof candidate.target === 'number') {
        return candidate.target;
    }

    if (typeof candidate.id === 'number') {
        return candidate.id;
    }

    return undefined;
};
export const mapType = (context: TransformContext, type: SomeType | ReflectionType | undefined): DocType | null => {
    const out = toDocType(type);
    try {
        if (out && typeof out === 'object' && out.type === 'reference') {
            const targetId = pickReferenceTarget(out as ReferenceCandidate);
            if (typeof targetId === 'number') {
                const node = context.nodes.get(targetId);
                if (node?.type && typeof node.type === 'object') {
                    return node.type;
                }
            }
        }
    } catch {
        // swallow any errors and fall back to the original mapped type
    }

    return out;
};

export const mapComment = (context: TransformContext, comment?: Comment | null): DocComment | null =>
    context.commentTransformer.toDocComment(comment ?? undefined);

export const mapSources = (sources: SourceReference[] | undefined): DocSource[] => {
    if (!Array.isArray(sources)) {
        return [];
    }
    return sources.map((source) => {
        const result: DocSource = {
            fileName: source.fileName,
            line: source.line,
            character: source.character
        };

        if (typeof source.url === 'string' && source.url.length > 0) {
            result.url = source.url;
        }

        return result;
    });
};
export const primaryUrlFromSources = (sources?: SourceReference[]): string | undefined =>
    Array.isArray(sources)
        ? sources.find((source) => typeof source.url === 'string' && source.url.length > 0)?.url
        : undefined;

export const mapSignatureParameters = (
    context: TransformContext,
    parameters: readonly ParameterReflection[] | undefined
): DocSignatureParameter[] => {
    if (!parameters) return [];

    return parameters.map((parameter) => {
        const result: DocSignatureParameter = {
            id: parameter.id,
            name: parameter.name,
            kind: parameter.kind,
            type: mapType(context, parameter.type),
            comment: mapComment(context, parameter.comment),
            flags: mapFlags(parameter)
        };

        if (typeof parameter.defaultValue === 'string') {
            result.defaultValue = parameter.defaultValue;
        }

        return result;
    });
};

export const mapTypeParameters = (
    context: TransformContext,
    parameters: readonly TypeParameterReflection[] | undefined
): DocTypeParameter[] => {
    if (!parameters) return [];

    return parameters.map((parameter) => {
        const optionalFromDefault = parameter.default !== undefined;
        const optionalFromFlags = Boolean((parameter.flags as { isOptional?: boolean }).isOptional);
        const out: DocTypeParameter = {
            id: parameter.id,
            name: parameter.name,
            flags: {
                isOptional: optionalFromDefault || optionalFromFlags
            }
        };

        const constraint = mapType(context, parameter.type);
        if (constraint !== null) {
            out.constraint = constraint;
        }

        const def = mapType(context, parameter.default);
        if (def !== null) {
            out.default = def;
        }

        const variance = parameter.varianceModifier;
        if (variance !== undefined) {
            out.variance = variance;
        }

        const comment = mapComment(context, parameter.comment);
        if (comment !== null) {
            out.comment = comment;
        }

        return out;
    });
};

export const mapReference = (context: TransformContext, reference: unknown): DocReference | null => {
    if (!reference || typeof reference !== 'object') {
        return null;
    }

    const candidate = reference as ReferenceCandidate;

    const name = typeof candidate.name === 'string' && candidate.name.length > 0 ? candidate.name : undefined;
    if (!name) {
        return null;
    }

    const packageName = selectPackageName(candidate, context.manifest.name);
    const qualifiedName =
        typeof candidate.qualifiedName === 'string' && candidate.qualifiedName.length > 0
            ? candidate.qualifiedName
            : undefined;
    const target = pickReferenceTarget(candidate);
    const externalUrl = pickReferenceUrl(candidate);

    const result: DocReference = { name };

    if (packageName) {
        result.packageName = packageName;
    }

    if (qualifiedName) {
        result.qualifiedName = qualifiedName;
    }

    if (externalUrl) {
        result.externalUrl = externalUrl;
    }

    if (typeof target === 'number') {
        const owningPackage = result.packageName ?? context.manifest.name;
        result.targetKey = toGlobalId(owningPackage, target);
    }

    return result;
};

export const mapGroups = (group: ReflectionGroup, packageName: string): DocGroup => {
    const childIds = Array.isArray(group.children) ? group.children : [];
    const childKeys: GlobalId[] = [];

    for (const raw of childIds) {
        if (typeof raw === 'number') {
            childKeys.push(toGlobalId(packageName, raw));
            continue;
        }

        const maybeId = (raw as { id?: number }).id;
        if (typeof maybeId === 'number') {
            childKeys.push(toGlobalId(packageName, maybeId));
        }
    }

    return {
        title: group.title,
        kind: 'kind' in group ? ((group as { kind?: ReflectionKind }).kind ?? null) : null,
        childKeys
    };
};

function sigFragment(signature: SignatureReflection): string {
    const HASH_BASE = 36;
    const name = signature.name;
    const params = (signature.parameters ?? []).map((parameter) => typeToken(parameter.type)).join(',');
    const ret = typeToken(signature.type);
    let hash = 5381;
    for (const ch of `${name}(${params}):${ret}`) {
        hash = (hash << 5) + hash + ch.charCodeAt(0);
    }
    return `${name}-${(hash >>> 0).toString(HASH_BASE)}`;
}

const mapSignatureComments = (
    context: TransformContext,
    signature: SignatureReflection
): {
    comment: DocComment | null;
    returnsComment: DocCommentBlockTag | null;
    throws: DocCommentBlockTag[];
} => {
    const comment = mapComment(context, signature.comment);
    const returnsTag = signature.comment?.getTag('@returns') ?? null;
    const throwsTags = signature.comment?.getTags('@throws') ?? [];

    return {
        comment,
        returnsComment: returnsTag ? context.commentTransformer.toBlockTag(returnsTag) : null,
        throws: throwsTags.map((tag) => context.commentTransformer.toBlockTag(tag))
    };
};

const registerSignatureFragment = (signature: SignatureReflection, registry?: Set<string>): string => {
    const fragment = sigFragment(signature);
    if (!registry) {
        return fragment;
    }

    let attempt = 0;
    let candidate = fragment;
    while (registry.has(candidate)) {
        attempt += 1;
        candidate = `${fragment}-o${attempt}`;
    }
    registry.add(candidate);
    return candidate;
};

export const mapSignature = (
    context: TransformContext,
    signature: SignatureReflection,
    parent: { id: number; name: string; slug: string },
    index: number,
    fragmentRegistry?: Set<string>
): DocSignature => {
    const { comment, returnsComment, throws } = mapSignatureComments(context, signature);
    const fragment = registerSignatureFragment(signature, fragmentRegistry);
    const anchor = `${parent.slug}#${fragment}`;

    const docSignature: DocSignature = {
        name: signature.name && signature.name.length > 0 ? signature.name : parent.name,
        kind: signature.kind,
        fragment,
        anchor,
        overloadIndex: index,
        kindLabel: kindLabel(signature.kind),
        flags: mapFlags(signature),
        type: mapType(context, signature.type),
        parameters: mapSignatureParameters(context, signature.parameters),
        typeParameters: mapTypeParameters(context, signature.typeParameters),
        comment,
        returnsComment,
        sources: mapSources(signature.sources),
        overwrites: mapReference(context, signature.overwrites),
        inheritedFrom: mapReference(context, signature.inheritedFrom),
        implementationOf: mapReference(context, signature.implementationOf)
    };

    if (throws.length > 0) {
        docSignature.throws = throws;
    }

    const sourceUrl = primaryUrlFromSources(signature.sources);
    if (typeof sourceUrl === 'string') {
        docSignature.sourceUrl = sourceUrl;
    }

    if (typeof signature.id === 'number') {
        docSignature.id = signature.id;
    }

    const renderedSignature = renderSignatureView(context, docSignature);
    docSignature.render = renderedSignature;
    docSignature.renderText = formatRenderedSignature(renderedSignature);

    return docSignature;
};

const mapDocTypeArray = (
    context: TransformContext,
    types: readonly (SomeType | ReflectionType)[] | undefined
): DocType[] => {
    const out: DocType[] = [];
    for (const type of types ?? []) {
        const mapped = mapType(context, type);
        if (mapped) out.push(mapped);
    }
    return out;
};

export const mapInheritance = (context: TransformContext, reflection: DeclarationReflection): DocInheritance => ({
    extends: mapDocTypeArray(context, reflection.extendedTypes),
    implements: mapDocTypeArray(context, reflection.implementedTypes),
    extendedBy: mapDocTypeArray(context, reflection.extendedBy),
    implementedBy: mapDocTypeArray(context, reflection.implementedBy)
});
