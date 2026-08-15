import { memberFragment } from '@seedcord/docs-engine';

import { formatCommentRich } from '#lib/docs/comments/formatter';
import { opensInNewTab } from '#lib/docs/crossPackage';

import { buildSignatureDetails } from './buildSignatureDetails';
import {
    buildDeprecationStatusFromNodeLike,
    cloneExamples,
    collectMemberTags,
    deriveSharedDocumentation,
    normalizeAccessor,
    resolveHeaderSignature,
    selectDescription
} from './utils';

import type { FormatContext, SeeAlsoEntryWithoutTarget, EntityMemberSummary } from '#lib/docs/types';
import type { DocNode } from '@seedcord/docs-engine';

export async function buildMemberSummary(node: DocNode, context: FormatContext): Promise<EntityMemberSummary> {
    const memberId = memberFragment(node);
    const headerSignature = await resolveHeaderSignature(node, context);
    const nodeComment = await formatCommentRich(node.comment, context);
    const signatureComments = await Promise.all(node.signatures.map((sig) => formatCommentRich(sig.comment, context)));

    const { description, signatureIndex } = selectDescription(signatureComments, nodeComment);
    const sharedDocumentation = deriveSharedDocumentation(nodeComment, description, signatureIndex);
    const sharedExamples = cloneExamples(nodeComment.examples);
    const signatures = await buildSignatureDetails({
        node,
        context,
        signatureComments,
        description,
        descriptionSignatureIndex: signatureIndex,
        headerSignature
    });

    const summary: EntityMemberSummary = {
        id: memberId,
        label: node.name,
        description,
        sharedDocumentation,
        sharedExamples,
        throws: nodeComment.throws ?? [],
        defaultValue: nodeComment.defaultValue ?? [],
        seeAlso: (nodeComment.seeAlso ?? []).map((s) => {
            const entry: SeeAlsoEntryWithoutTarget = { name: s.name };
            if (s.href?.length) entry.href = s.href;
            return entry;
        }),
        signatures
    };

    summary.deprecationStatus = buildDeprecationStatusFromNodeLike(node);

    const tags = collectMemberTags(node);
    if (tags.length) summary.tags = tags;
    if (node.flags.access === 'public' || node.flags.access === 'protected') {
        summary.access = node.flags.access;
    }
    const accessorType = normalizeAccessor(node.flags.accessor);
    if (accessorType) summary.accessorType = accessorType;
    if (node.sourceUrl) summary.sourceUrl = node.sourceUrl;
    if (node.inheritedFrom?.name) {
        const href = context.engine.resolver().href(context.manifestPackage, node.inheritedFrom);
        if (href) {
            const entry: { name: string; href: string; external?: boolean } = { name: node.inheritedFrom.name, href };
            if (opensInNewTab(href, context.manifestPackage)) entry.external = true;
            summary.inheritedFrom = entry;
        } else {
            summary.inheritedFrom = node.inheritedFrom.name;
        }
    }

    return summary;
}
