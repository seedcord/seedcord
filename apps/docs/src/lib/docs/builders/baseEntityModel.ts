import { buildDeprecationStatusFromNodeLike, ensureSlug } from './utils';

import type {
    BaseEntityModel,
    CodeRepresentation,
    CommentExample,
    CommentParagraph,
    EntityKind,
    WithSeeAlso,
    WithThrows
} from '../types';
import type { DocNode } from '@seedcord/docs-engine';

export function buildEntityTags(node: DocNode): string[] {
    const tags = new Set<string>();
    const flags = node.flags;

    if (flags.isInternal) tags.add('internal');
    if (flags.isDecorator) tags.add('decorator');

    if (node.signatures.length > 0) {
        for (const sig of node.signatures) {
            const sflags = sig.flags;
            if (sflags.isInternal) tags.add('internal');
            if (sflags.isDecorator) tags.add('decorator');
        }
    }

    return Array.from(tags);
}

interface BuildBaseEntityModelParams extends WithThrows, WithSeeAlso {
    node: DocNode;
    kind: EntityKind;
    manifestPackage: string;
    displayPackage: string;
    summary: readonly CommentParagraph[];
    summaryExamples: readonly CommentExample[];
    signature: CodeRepresentation;
}

export function buildBaseEntityModel(params: BuildBaseEntityModelParams): BaseEntityModel {
    const { node, kind, manifestPackage, displayPackage, summary, summaryExamples, signature, seeAlso, throws } =
        params;
    const base: BaseEntityModel = {
        kind,
        name: node.name,
        slug: ensureSlug(node),
        qualifiedName: node.qualifiedName,
        manifestPackage,
        displayPackage,
        summary,
        summaryExamples,
        signature,
        deprecationStatus: buildDeprecationStatusFromNodeLike(node)
    };

    const entityTags = buildEntityTags(node);
    if (entityTags.length) base.tags = entityTags;

    if (node.packageVersion) base.version = node.packageVersion;
    if (node.sourceUrl) base.sourceUrl = node.sourceUrl;
    if (seeAlso?.length) base.seeAlso = seeAlso;
    if (throws?.length) base.throws = throws;

    return base;
}
