import { renderInlineValue } from './renderInlineValue';
import { partsToMarkdown } from './renderParagraphs';

import type { CommentParagraph, FormatContext } from '@lib/docs/types';
import type { DocComment } from '@seedcord/docs-engine';

export async function renderDefaultValue(
    comment: DocComment,
    context: FormatContext
): Promise<CommentParagraph[] | undefined> {
    const tag = comment.blockTags.find((t) => t.tag === '@defaultValue');
    if (!tag) return undefined;

    return renderInlineValue(partsToMarkdown(tag.content, context), context);
}
