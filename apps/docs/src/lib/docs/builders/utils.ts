import { cloneCommentParagraphs, createPlainParagraph } from '#lib/docs/comments/creators';
import { formatDeclarationHeader, formatSignature, highlightCode } from '#lib/docs/formatting';

import type {
    CommentExample,
    FormatContext,
    CommentParagraph,
    FormattedComment,
    DeprecationStatus
} from '#lib/docs/types';
import type { CodeRepresentation } from '@seedcord/ui';
import type { DocNode, DocSignature } from '@seedcord/docs-engine';

export type DocNodeLike = Pick<DocNode, 'flags' | 'comment'>;

export const cloneExamples = (examples: readonly CommentExample[] | null | undefined): CommentExample[] =>
    examples?.length ? [...examples] : [];

export const ensureSlug = (node: DocNode): string =>
    typeof node.slug === 'string' && node.slug.length > 0 ? node.slug : String(node.id);

export const ensureSignatureAnchor = (signature: DocSignature): string =>
    typeof signature.anchor === 'string' && signature.anchor.length > 0
        ? signature.anchor
        : `${signature.name}-${signature.overloadIndex}`;

export async function resolveHeaderSignature(node: DocNode, context: FormatContext): Promise<CodeRepresentation> {
    if (node.header) return formatDeclarationHeader(node.header, context, node.flags.isOptional);

    const rendered = node.signatures[0]?.render;
    if (rendered) {
        return formatSignature(rendered, context, node.flags.isOptional);
    }

    return highlightCode(node.headerText ?? node.name);
}

interface DescriptionSelection {
    description: CommentParagraph | null;
    signatureIndex: number | null;
}

export function selectDescription(
    signatureComments: (FormattedComment | undefined)[],
    nodeComment: FormattedComment
): DescriptionSelection {
    // with 2+ self-documented overloads, showing one in the header would misrepresent the others, so
    // each description stays in its own signature panel and the header falls back to the node-level
    // description.
    const selfDocumented = signatureComments.filter((comment) => comment?.paragraphs[0]).length;
    if (selfDocumented < 2) {
        for (let index = 0; index < signatureComments.length; index += 1) {
            const [firstParagraph] = signatureComments[index]?.paragraphs ?? [];
            if (firstParagraph) {
                return { description: firstParagraph, signatureIndex: index };
            }
        }
    }

    const [firstParagraph] = nodeComment.paragraphs;
    if (firstParagraph) {
        return { description: firstParagraph, signatureIndex: null };
    }

    return { description: null, signatureIndex: null };
}

export function stripDuplicateDescription(
    paragraphs: readonly CommentParagraph[],
    description: CommentParagraph | null
): CommentParagraph[] {
    if (description && paragraphs.length && paragraphs[0] === description) {
        return paragraphs.slice(1);
    }

    return cloneCommentParagraphs(paragraphs);
}

export function deriveSharedDocumentation(
    nodeComment: FormattedComment,
    description: CommentParagraph | null,
    descriptionSignatureIndex: number | null
): CommentParagraph[] {
    if (descriptionSignatureIndex !== null) {
        return cloneCommentParagraphs(nodeComment.paragraphs);
    }

    return stripDuplicateDescription(nodeComment.paragraphs, description);
}

export function buildDeprecationStatusFromNodeLike(
    node: DocNodeLike,
    // the rendered form carries the links and inline code that block.text flattens away
    rendered?: readonly CommentParagraph[] | undefined
): DeprecationStatus {
    if (!node.flags.isDeprecated) return { isDeprecated: false };
    if (rendered?.length) return { isDeprecated: true, deprecationMessage: [...rendered] };

    const deprecationBlock = node.comment?.blockTags.find((val) => val.tag === '@deprecated');

    let paragraphs: CommentParagraph[] | undefined;
    const deprecationText = deprecationBlock?.text;
    if (typeof deprecationText === 'string' && deprecationText.length > 0) {
        paragraphs = [createPlainParagraph(deprecationText)];
    }

    return {
        isDeprecated: true,
        deprecationMessage: paragraphs
    };
}

// api-extractor hangs a method's doc comment off its signature, leaving the member node with the flag alone
export function resolveMemberDeprecation(
    node: DocNodeLike,
    signatures: readonly { deprecationStatus?: DeprecationStatus | undefined }[],
    rendered?: readonly CommentParagraph[] | undefined
): DeprecationStatus {
    const own = buildDeprecationStatusFromNodeLike(node, rendered);
    if (!own.isDeprecated || own.deprecationMessage?.length) return own;

    for (const signature of signatures) {
        const status = signature.deprecationStatus;
        if (status?.isDeprecated && status.deprecationMessage?.length) {
            return { isDeprecated: true, deprecationMessage: status.deprecationMessage };
        }
    }

    return own;
}
