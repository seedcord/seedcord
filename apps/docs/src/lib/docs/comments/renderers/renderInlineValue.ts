import { marked } from 'marked';

import { sanitizeHtml } from '@lib/sanitizeHtml';

import { decorateProseLinks } from './decorateProseLinks';

import type { CommentParagraph, FormatContext } from '@lib/docs/types';

export async function renderInlineValue(
    markdown: string,
    context: FormatContext
): Promise<CommentParagraph[] | undefined> {
    const trimmed = markdown.trim();
    if (!trimmed) return undefined;

    // parseInline skips the wrapping paragraph tag so the value sits inline next to the "Default:" label
    const parsed = await marked.parseInline(trimmed, { async: true });
    const html = sanitizeHtml(decorateProseLinks(parsed, context.manifestPackage));

    return [{ plain: trimmed, html }];
}
