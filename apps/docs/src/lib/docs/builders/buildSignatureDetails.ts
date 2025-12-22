import {
    ensureSlug,
    stripDuplicateDescription,
    cloneExamples,
    ensureSignatureAnchor,
    buildDeprecationStatusFromNodeLike
} from './utils';
import { cloneCommentParagraphs } from '../comments/creators';
import { formatCommentRich } from '../comments/formatter';
import { formatSignature, highlightCode } from '../formatting';

import type { CodeRepresentation, CommentExample, CommentParagraph, FormatContext, FormattedComment } from '../types';
import type { EntityMemberSummary } from '@components/docs/entity/types';
import type { DocSignature, DocNode } from '@seedcord/docs-engine';

interface SignatureDetailsOptions {
    node: DocNode;
    context: FormatContext;
    signatureComments: (FormattedComment | undefined)[];
    description: CommentParagraph | null;
    descriptionSignatureIndex: number | null;
    headerSignature: CodeRepresentation;
}

function buildModifierPrefix(node: DocNode, signature?: { kindLabel?: string }): string {
    const flags = node.flags;
    const parts: string[] = [];

    const access = flags.access as string | undefined;
    if (access) parts.push(access);

    if (flags.isAbstract === true) parts.push('abstract');
    if (flags.isStatic === true) parts.push('static');
    if (flags.isReadonly === true) parts.push('readonly');
    if (flags.isAsync === true) parts.push('async');

    let accessorToken: string | undefined;
    if (signature && typeof signature.kindLabel === 'string') {
        const kl = signature.kindLabel.toLowerCase();
        if (kl.includes('get')) accessorToken = 'get';
        if (kl.includes('set')) accessorToken = 'set';
    }

    if (!accessorToken) {
        const accessor = flags.accessor as string | undefined;
        if (accessor === 'getter') accessorToken = 'get';
        if (accessor === 'setter') accessorToken = 'set';
    }

    if (accessorToken) parts.push(accessorToken);

    return parts.join(' ');
}

export async function buildSignatureDetails({
    node,
    context,
    signatureComments,
    description,
    descriptionSignatureIndex,
    headerSignature
}: SignatureDetailsOptions): Promise<EntityMemberSummary['signatures']> {
    if (node.signatures.length === 0) {
        const documentation: CommentParagraph[] = [];
        const examples: CommentExample[] = [];
        const anchor = ensureSlug(node);
        const fallbackDetail: EntityMemberSummary['signatures'][number] = {
            id: `${anchor}-signature`,
            anchor,
            code: headerSignature,
            documentation,
            examples
        };

        if (node.sourceUrl) {
            fallbackDetail.sourceUrl = node.sourceUrl;
        }

        return [fallbackDetail];
    }

    return Promise.all(
        node.signatures.map(async (signature, index) => {
            const baseCode = signature.render
                ? await formatSignature(signature.render, context)
                : await highlightCode(signature.name);

            const modifierPrefix = buildModifierPrefix(node, { kindLabel: signature.kindLabel });
            const code = modifierPrefix ? await highlightCode(`${modifierPrefix} ${baseCode.text}`) : baseCode;

            const comment = signatureComments[index];
            let documentation = cloneCommentParagraphs(comment?.paragraphs);
            if (descriptionSignatureIndex === index) {
                documentation = stripDuplicateDescription(documentation, description);
            }

            const sig = signature;
            await appendParameterComments(sig, context, documentation);
            await appendTypeParameterComments(sig, context, documentation);

            const examples = cloneExamples(comment?.examples ?? []);

            const detail: EntityMemberSummary['signatures'][number] = {
                id: ensureSignatureAnchor(signature),
                anchor: ensureSignatureAnchor(signature),
                code,
                documentation,
                examples,
                throws: comment?.throws ?? []
            };

            const sigDep = buildDeprecationStatusFromNodeLike(signature as unknown as DocNode);
            if (sigDep.isDeprecated) detail.deprecationStatus = sigDep;

            const signatureSourceUrl = signature.sourceUrl ?? node.sourceUrl;
            if (signatureSourceUrl) {
                detail.sourceUrl = signatureSourceUrl;
            }

            return detail;
        })
    );
}

async function appendParameterComments(
    sig: DocSignature,
    context: FormatContext,
    documentation: CommentParagraph[]
): Promise<void> {
    if (!sig.parameters.length) return;
    for (const param of sig.parameters) {
        if (param.comment) {
            const formatted = await formatCommentRich(param.comment, context);
            if (formatted.paragraphs.length) {
                documentation.push({
                    plain: `Parameter: ${param.name}`,
                    html: `<strong>Parameter:</strong> <code>${param.name}</code>`
                });
                documentation.push(...formatted.paragraphs);
            }
        }
    }
}

async function appendTypeParameterComments(
    sig: DocSignature,
    context: FormatContext,
    documentation: CommentParagraph[]
): Promise<void> {
    if (!sig.typeParameters.length) return;
    for (const tp of sig.typeParameters) {
        if (tp.comment) {
            const formatted = await formatCommentRich(tp.comment, context);
            if (formatted.paragraphs.length) {
                documentation.push({
                    plain: `Type parameter: ${tp.name}`,
                    html: `<strong>Type parameter:</strong> <code>${tp.name}</code>`
                });
                documentation.push(...formatted.paragraphs);
            }
        }
    }
}
