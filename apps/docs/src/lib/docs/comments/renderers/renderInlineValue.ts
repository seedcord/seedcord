import { marked } from 'marked';

import { sanitizeHtml } from '@lib/sanitizeHtml';

import { decorateProseLinks } from './decorateProseLinks';

import type { CommentParagraph, FormatContext } from '@lib/docs/types';

// renders a short inline markdown value (a default value, a label) to a single CommentParagraph
export async function renderInlineValue(
    markdown: string,
    context: FormatContext
): Promise<CommentParagraph[] | undefined> {
    const trimmed = markdown.trim();
    if (!trimmed) return undefined;

    // inline, not block, so the value renders on the same line as a "Default:" label
    const parsed = await marked.parseInline(trimmed, { async: true });
    const html = sanitizeHtml(decorateProseLinks(parsed, context.manifestPackage));

    return [{ plain: trimmed, html }];
}
