import { cloneCommentParagraphs, createPlainParagraph } from '#lib/docs/comments/creators';
import { formatDeclarationHeader, formatSignature, highlightCode } from '#lib/docs/formatting';

import type {
    CommentExample,
    FormatContext,
    CodeRepresentation,
    CommentParagraph,
    FormattedComment,
    DeprecationStatus,
    EntityMemberSummary
} from '#lib/docs/types';
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

function computeModifierParts(node: DocNode): string[] {
    const parts: string[] = [];
    if (node.flags.access) parts.push(node.flags.access);
    if (node.flags.isReadonly) parts.push('readonly');
    if (node.flags.isAbstract) parts.push('abstract');
    if (node.flags.isStatic) parts.push('static');
    if (node.flags.isAsync) parts.push('async');
    return parts;
}

function headerHasPrefix(headerText: string, parts: string[]): boolean {
    const base = headerText.trim().toLowerCase();
    const prefix = parts.join(' ').trim().toLowerCase();

    const baseTokens = base.split(/\s+/).filter(Boolean);
    const prefixTokens = prefix.split(/\s+/).filter(Boolean);

    if (prefixTokens.length > baseTokens.length) return false;

    for (let i = 0; i < prefixTokens.length; i += 1) {
        if (baseTokens[i] !== prefixTokens[i]) return false;
    }

    return true;
}

export async function resolveHeaderSignature(node: DocNode, context: FormatContext): Promise<CodeRepresentation> {
    if (node.header) {
        const headerRep = await formatDeclarationHeader(node.header, context);

        const accessAtStart = headerRep.text.match(/^(public|protected)\b/);
        if (accessAtStart) {
            const access = accessAtStart[1];
            if (node.flags.isReadonly && !/^\s*(?:public|protected)\s+readonly\b/.test(headerRep.text)) {
                const rest = headerRep.text.replace(/^(?:public|protected)\b\s*/i, '');
                return highlightCode(`${access} readonly ${rest}`);
            }

            return headerRep;
        }

        const parts = computeModifierParts(node);

        if (parts.length) {
            if (headerHasPrefix(headerRep.text, parts)) {
                return headerRep;
            }

            return highlightCode(`${parts.join(' ')} ${headerRep.text}`);
        }

        return headerRep;
    }

    const rendered = node.signatures[0]?.render;
    if (rendered) {
        return formatSignature(rendered, context);
    }

    return highlightCode(node.headerText ?? node.name);
}

export function normalizeAccessor(accessor?: string | null): EntityMemberSummary['accessorType'] {
    if (!accessor) {
        return undefined;
    }

    if (accessor === 'getter' || accessor === 'setter') {
        return accessor;
    }

    return 'accessor';
}

export function collectMemberTags(node: DocNode): string[] {
    const tags = new Set<string>();

    const addFlags = (f: DocNode['flags'] | undefined): void => {
        if (!f) return;
        if (f.isStatic) tags.add('static');
        if (f.isAbstract) tags.add('abstract');
        if (f.isOptional) tags.add('optional');
        if (f.isDeprecated) tags.add('deprecated');
        if (f.isInternal) tags.add('internal');
        if (f.isOverwriting === true) tags.add('overrides');
        if (typeof f.accessor === 'string') tags.add('accessor');
        if (f.isDecorator === true) tags.add('decorator');
    };

    addFlags(node.flags);

    if (node.comment?.modifierTags) {
        for (const tag of node.comment.modifierTags) {
            if (tag === '@virtual') tags.add('virtual');
        }
    }

    if (Array.isArray(node.signatures) && node.signatures.length > 0) {
        for (const sig of node.signatures) {
            addFlags(sig.flags);
            if (sig.comment?.modifierTags) {
                for (const tag of sig.comment.modifierTags) {
                    if (tag === '@virtual') tags.add('virtual');
                }
            }
        }
    }

    return Array.from(tags);
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
