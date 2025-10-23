import path from 'node:path';

import { PackageDirectory } from '../directory';
import { ProjectLoader } from '../project-loader';
import { NodeTransformer } from '../transformers/node-transformer';
import { createTransformContext } from '../transformers/transform-context';

import type {
    DocIndexes,
    DocManifestPackage,
    DocNode,
    DocPackageModel,
    DocSearchEntry,
    DocSignature,
    InlineType,
    RenderedSignature,
    SigPart
} from '../types';
import type { ReflectionKind } from 'typedoc';

export interface PackageLookups {
    byName: Map<string, DocManifestPackage>;
    byAlias: Map<string, DocManifestPackage>;
}

const buildIndexes = (root: DocNode, manifest: DocManifestPackage): DocIndexes => {
    const byId = new Map<number, DocNode>();
    const bySlug = new Map<string, DocNode>();
    const byQName = new Map<string, DocNode>();
    const byKind = new Map<ReflectionKind, DocNode[]>();
    const search: DocSearchEntry[] = [];

    const visit = (node: DocNode): void => {
        byId.set(node.id, node);
        bySlug.set(node.slug, node);
        if (node.qualifiedName.length > 0) {
            byQName.set(node.qualifiedName, node);
        }

        const bucket = byKind.get(node.kind) ?? [];
        bucket.push(node);
        byKind.set(node.kind, bucket);

        search.push(createSearchEntry(node, manifest));

        for (const child of node.children) {
            visit(child);
        }
    };

    visit(root);

    return { byId, bySlug, byQName, byKind, search };
};

const createSearchEntry = (node: DocNode, manifest: DocManifestPackage): DocSearchEntry => {
    const summary = node.comment?.summary ?? '';
    const nodeAliases = collectAliases(node);
    const signatureAliases = node.signatures.flatMap((signature) => {
        const aliasTags = collectSignatureAliases(signature);
        const label = formatSignatureLabel(signature);
        if (label.length > 0) {
            aliasTags.unshift(label);
        }
        return aliasTags;
    });
    const aliases = Array.from(new Set([...nodeAliases, ...signatureAliases]));
    const fileName = node.sources[0]?.fileName;
    const file = typeof fileName === 'string' && fileName.length > 0 ? path.basename(fileName) : undefined;

    const tokens = collectTokens(node, summary, file, aliases);

    const entry: DocSearchEntry = {
        slug: node.slug,
        name: node.name,
        qualifiedName: node.qualifiedName,
        packageName: node.packageName,
        kind: node.kind,
        summary: summary || null,
        tokens
    };

    if (typeof manifest.version === 'string' && manifest.version.length > 0) {
        entry.packageVersion = manifest.version;
    }

    if (aliases.length > 0) {
        entry.aliases = aliases;
    }

    if (file) {
        entry.file = file;
    }

    return entry;
};

const collectAliases = (node: DocNode): string[] => {
    const comment = node.comment;
    if (!comment) {
        return [];
    }

    const aliasTags = comment.blockTags.filter((tag) => tag.tag === '@alias' || tag.tag === '@label');
    const values = aliasTags.map((tag) => tag.text.trim()).filter((text) => text.length > 0);

    return Array.from(new Set(values));
};

const collectSignatureAliases = (signature: DocSignature): string[] => {
    const comment = signature.comment;
    if (!comment) {
        return [];
    }

    const aliasTags = comment.blockTags.filter((tag) => tag.tag === '@alias' || tag.tag === '@label');
    const values = aliasTags.map((tag) => tag.text.trim()).filter((text) => text.length > 0);

    return Array.from(new Set(values));
};

const addTokensFromText = (tokens: Set<string>, value: string | undefined): void => {
    if (!value) {
        return;
    }

    const normalized = value
        .replace(/([a-z0-9])([A-Z])/gu, '$1 $2')
        .split(/[^a-zA-Z0-9]+/gu)
        .filter(Boolean);

    for (const part of normalized) {
        tokens.add(part.toLowerCase());
    }
};

const addTokensFromSigParts = (tokens: Set<string>, parts: SigPart[]): void => {
    for (const part of parts) {
        if (part.kind === 'space') {
            continue;
        }
        const text = 'text' in part ? part.text.trim() : undefined;
        if (text) {
            addTokensFromText(tokens, text);
        }
    }
};

const addTokensFromInlineType = (tokens: Set<string>, inline?: InlineType): void => {
    if (!inline) {
        return;
    }
    addTokensFromSigParts(tokens, inline.parts);
};

const addTokensFromRenderedSignature = (tokens: Set<string>, render?: RenderedSignature): void => {
    if (!render) {
        return;
    }

    addTokensFromSigParts(tokens, render.name);

    for (const typeParam of render.typeParams ?? []) {
        addTokensFromText(tokens, typeParam.name);
        addTokensFromInlineType(tokens, typeParam.constraint);
        addTokensFromInlineType(tokens, typeParam.default);
    }

    for (const parameter of render.parameters) {
        addTokensFromText(tokens, parameter.name);
        addTokensFromInlineType(tokens, parameter.type);
        addTokensFromText(tokens, parameter.defaultValue);
    }

    addTokensFromInlineType(tokens, render.returnType);
};

const sigPartsToText = (parts: SigPart[]): string => {
    let result = '';
    for (const part of parts) {
        if (part.kind === 'space') {
            if (!result.endsWith(' ')) {
                result += ' ';
            }
            continue;
        }
        result += part.text;
    }
    return result.trim();
};

const inlineTypeToText = (inline?: InlineType): string => (inline ? sigPartsToText(inline.parts) : '');

const formatSignatureLabel = (signature: DocSignature): string => {
    if (signature.renderText && signature.renderText.length > 0) {
        return signature.renderText;
    }

    const render = signature.render;
    if (!render) {
        return signature.name;
    }

    const nameText = sigPartsToText(render.name);
    const typeParams =
        render.typeParams && render.typeParams.length > 0
            ? `<${render.typeParams.map((param) => param.name).join(', ')}>`
            : '';
    const parameters = render.parameters
        .map((param) => {
            const optional = param.optional ? '?' : '';
            const typeText = param.type ? `: ${inlineTypeToText(param.type)}` : '';
            return `${param.name}${optional}${typeText}`;
        })
        .join(', ');
    const returnType = render.returnType ? `: ${inlineTypeToText(render.returnType)}` : '';

    return `${nameText}${typeParams}(${parameters})${returnType}`.trim();
};

const collectSignatureTokens = (signature: DocSignature, aliases: string[]): string[] => {
    const tokens = new Set<string>();

    addTokensFromText(tokens, signature.name);

    for (const parameter of signature.parameters) {
        addTokensFromText(tokens, parameter.name);
    }

    for (const typeParam of signature.typeParameters) {
        addTokensFromText(tokens, typeParam.name);
    }

    addTokensFromRenderedSignature(tokens, signature.render);
    addTokensFromText(tokens, signature.renderText);

    for (const alias of aliases) {
        addTokensFromText(tokens, alias);
    }

    const signatureSummary = signature.comment?.summary ?? '';
    addTokensFromText(tokens, signatureSummary);

    return Array.from(tokens);
};

const collectTokens = (node: DocNode, summary: string, file: string | undefined, aliases: string[]): string[] => {
    const tokens = new Set<string>();

    const textSources = [node.name, ...node.path, node.qualifiedName, summary, ...aliases];
    if (file) {
        textSources.push(file);
    }

    for (const source of textSources) {
        addTokensFromText(tokens, source);
    }

    for (const signature of node.signatures) {
        const signatureAliases = [...collectSignatureAliases(signature), formatSignatureLabel(signature)].filter(
            (value): value is string => value.length > 0
        );

        const signatureTokens = collectSignatureTokens(signature, signatureAliases);
        for (const token of signatureTokens) {
            tokens.add(token);
        }
    }

    for (const typeParam of node.typeParameters) {
        addTokensFromText(tokens, typeParam.name);
    }

    return Array.from(tokens);
};

export const buildPackage = async (
    pkg: DocManifestPackage,
    projectPath: string,
    lookups: PackageLookups
): Promise<DocPackageModel> => {
    const loader = new ProjectLoader();
    const project = await loader.fromFile(projectPath);
    const context = createTransformContext(pkg, {
        packagesByName: lookups.byName,
        packagesByAlias: lookups.byAlias
    });
    const transformer = new NodeTransformer(context);
    const root = transformer.transform(project);
    const indexes = buildIndexes(root, pkg);
    const directory = PackageDirectory.fromIndexes(indexes);

    return {
        manifest: pkg,
        project,
        root,
        nodes: context.nodes,
        indexes,
        directory
    };
};
