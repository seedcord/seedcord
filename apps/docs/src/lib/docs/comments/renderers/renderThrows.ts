import { renderParagraphs } from './renderParagraphs';

import type { CommentParagraph, FormatContext } from '#lib/docs/types';
import type { DocComment } from '@seedcord/docs-engine';

export async function renderThrows(
    comment: DocComment,
    context: FormatContext
): Promise<CommentParagraph[] | undefined> {
    const pending = comment.blockTags.reduce<Promise<CommentParagraph[]>[]>((tasks, tag) => {
        if (tag.tag !== '@throws' && tag.tag !== '@exception') return tasks;

        const fakeComment: DocComment = {
            summary: '',
            summaryParts: tag.content,
            blockTags: [],
            modifierTags: [],
            examples: []
        };
        tasks.push(renderParagraphs(fakeComment, context));
        return tasks;
    }, []);

    const paragraphs = (await Promise.all(pending)).flat();
    return paragraphs.length ? paragraphs : undefined;
}
