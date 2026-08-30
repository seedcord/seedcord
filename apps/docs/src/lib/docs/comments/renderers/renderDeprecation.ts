import { renderParagraphs } from './renderParagraphs';

import type { CommentParagraph, FormatContext } from '#lib/docs/types';
import type { DocComment } from '@seedcord/docs-engine';

export async function renderDeprecation(
    comment: DocComment,
    context: FormatContext
): Promise<CommentParagraph[] | undefined> {
    const tag = comment.blockTags.find((t) => t.tag === '@deprecated');
    if (!tag) return undefined;

    const asComment: DocComment = {
        summary: '',
        summaryParts: tag.content,
        blockTags: [],
        modifierTags: [],
        examples: []
    };

    const paragraphs = await renderParagraphs(asComment, context);
    return paragraphs.length ? paragraphs : undefined;
}
