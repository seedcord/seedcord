import path from 'node:path';

import { ApiAdapter } from '@model/adapter';
import { DocKind } from '@model/kinds';
import { PackageDirectory } from '@src/PackageDirectory';
import { inlineTypeToText, sigPartsToText } from '@transformers/signature-renderer';

import type { ApiModel, ApiPackage } from '@microsoft/api-extractor-model';
import type {
    DocComment,
    DocIndexes,
    DocManifestPackage,
    DocNode,
    DocPackageModel,
    DocSearchEntry,
    DocSignature,
    InlineType,
    RenderedSignature,
    SigPart
} from '@src/types';

function buildIndexes(root: DocNode, manifest: DocManifestPackage): DocIndexes {
    const byId = new Map<number, DocNode>();
    const bySlug = new Map<string, DocNode>();
    const byQName = new Map<string, DocNode>();
    const byKind = new Map<number, DocNode[]>();
    const search: DocSearchEntry[] = [];

    const visit = (node: DocNode, ancestorsExported: boolean): void => {
        byId.set(node.id, node);
        bySlug.set(node.slug, node);
        if (node.qualifiedName.length > 0) {
            byQName.set(node.qualifiedName, node);
        }

        // Forgotten (referenced-only) declarations and @internal-tagged nodes stay resolvable as link
        // targets via the maps above, but are kept out of the sidebar (byKind) and search so both show
        // only the package's real public exports (the two-tier model). A non-searchable parent's
        // children inherit the exclusion even though the adapter marks each child isExported.
        const searchable = node.isExported && ancestorsExported && !node.flags.isInternal;
        if (searchable) {
            const bucket = byKind.get(node.kind) ?? [];
            bucket.push(node);
            byKind.set(node.kind, bucket);

            search.push(createSearchEntry(node, manifest));
        }

        for (const child of node.children) {
            visit(child, searchable);
        }
    };

    visit(root, true);

    return { byId, bySlug, byQName, byKind, search };
}

function createSearchEntry(node: DocNode, manifest: DocManifestPackage): DocSearchEntry {
    const summary = node.comment?.summary ?? '';
    const nodeAliases = collectCommentAliases(node.comment);
    const signatureAliases = node.signatures.flatMap((signature) => {
        const aliasTags = collectCommentAliases(signature.comment);
        const label = formatSignatureLabel(signature);
        if (label.length > 0) {
            aliasTags.unshift(label);
        }
        return aliasTags;
    });
    const aliases = [...new Set([...nodeAliases, ...signatureAliases])];
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

    if (node.kind === DocKind.EnumMember && node.defaultValue) {
        entry.value = node.defaultValue;
    }

    return entry;
}

function collectCommentAliases(comment: DocComment | null | undefined): string[] {
    if (!comment) return [];
    const aliasTags = comment.blockTags.filter((tag) => tag.tag === '@alias' || tag.tag === '@label');
    const values = aliasTags.map((tag) => tag.text.trim()).filter((text) => text.length > 0);
    return [...new Set(values)];
}

function addTokensFromText(tokens: Set<string>, value: string | undefined): void {
    if (!value) {
        return;
    }

    const normalized = value
        .replaceAll(/([a-z0-9])([A-Z])/gu, '$1 $2')
        .split(/[^a-zA-Z0-9]+/gu)
        .filter(Boolean);

    for (const part of normalized) {
        tokens.add(part.toLowerCase());
    }
}

function addTokensFromSigParts(tokens: Set<string>, parts: SigPart[]): void {
    for (const part of parts) {
        if (part.kind === 'space') {
            continue;
        }
        const text = 'text' in part ? part.text.trim() : undefined;
        if (text) {
            addTokensFromText(tokens, text);
        }
    }
}

function addTokensFromInlineType(tokens: Set<string>, inline?: InlineType): void {
    if (!inline) {
        return;
    }
    addTokensFromSigParts(tokens, inline.parts);
}

function addTokensFromRenderedSignature(tokens: Set<string>, render?: RenderedSignature): void {
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
}

function formatSignatureLabel(signature: DocSignature): string {
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
}

function collectSignatureTokens(signature: DocSignature, aliases: string[]): string[] {
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

    return [...tokens];
}

function collectTokens(node: DocNode, summary: string, file: string | undefined, aliases: string[]): string[] {
    const tokens = new Set<string>();

    const textSources = [node.name, ...node.path, node.qualifiedName, summary, ...aliases];
    if (file) {
        textSources.push(file);
    }

    for (const source of textSources) {
        addTokensFromText(tokens, source);
    }

    // enum members only. a blanket defaultValue index would also pull noise like the `true` on a
    // brand field into search.
    if (node.kind === DocKind.EnumMember) {
        addTokensFromText(tokens, node.defaultValue);
    }

    for (const signature of node.signatures) {
        const signatureAliases = [...collectCommentAliases(signature.comment), formatSignatureLabel(signature)].filter(
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

    return [...tokens];
}

// Requires apiPackage already loaded into the shared model so cross-package @link refs resolve.
export function buildPackageFromApi(pkg: DocManifestPackage, apiPackage: ApiPackage, model: ApiModel): DocPackageModel {
    return buildPackageFromModel(pkg, new ApiAdapter(pkg, model).transform(apiPackage));
}

// The node-free half of buildPackageFromApi: the remote project.json loader reuses it without the AE adapter.
export function buildPackageFromModel(pkg: DocManifestPackage, root: DocNode): DocPackageModel {
    const indexes = buildIndexes(root, pkg);
    const directory = PackageDirectory.fromIndexes(indexes);
    return {
        manifest: pkg,
        root,
        packageDocumentation: root.comment ?? null,
        nodes: indexes.byId,
        indexes,
        directory
    };
}
