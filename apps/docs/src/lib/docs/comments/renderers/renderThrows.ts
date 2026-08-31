import { renderParagraphs } from './renderParagraphs';

import type { CommentParagraph, FormatContext } from '#lib/docs/types';
import type { DocComment } from '@seedcord/docs-engine';

export async function renderThrows(
    comment: DocComment,
    context: FormatContext
): Promise<CommentParagraph[] | undefined> {
    const tags = comment.blockTags.filter((t) => t.tag === '@throws' || t.tag === '@exception');
    if (!tags.length) return undefined;

    const rendered = await Promise.all(
        tags.map((tag) => {
            const fakeComment: DocComment = {
                summary: '',
                summaryParts: tag.content,
                blockTags: [],
                modifierTags: [],
                examples: []
            };
            return renderParagraphs(fakeComment, context);
        })
    );

    const paragraphs: CommentParagraph[] = rendered.flat();
    return paragraphs.length ? paragraphs : undefined;
}
