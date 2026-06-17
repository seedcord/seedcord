import { marked } from 'marked';

import { sanitizeHtml } from '@lib/sanitizeHtml';

import { decorateProseLinks } from './decorateProseLinks';
import { partsToMarkdown } from './renderParagraphs';

import type { CommentParagraph, FormatContext } from '@lib/docs/types';
import type { DocComment } from '@seedcord/docs-engine';

export async function renderDefaultValue(
    comment: DocComment,
    context: FormatContext
): Promise<CommentParagraph[] | undefined> {
    const tag = comment.blockTags.find((t) => t.tag === '@defaultValue');
    if (!tag) return undefined;

    const markdown = partsToMarkdown(tag.content, context);
    if (!markdown.trim()) return undefined;

    // inline, not block, so the value renders on the same line as the "Default:" label.
    const parsed = await marked.parseInline(markdown, { async: true });
    const html = sanitizeHtml(decorateProseLinks(parsed, context.manifestPackage));

    return [{ plain: markdown, html }];
}
