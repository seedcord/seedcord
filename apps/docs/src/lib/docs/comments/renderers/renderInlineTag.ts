import { highlightInlineToHtml } from '../../../shiki';
import { escapeAttribute, sanitizeInternalHref, escapeHtml } from '../cleaners';
import { DEFAULT_INLINE_LANG } from '../constants';
import { resolveInlineHref } from '../resolvers';

import type { InlineTagPart, FormatContext } from '../../types';

export async function renderInlineTag(
    part: InlineTagPart,
    context: FormatContext
): Promise<{ plain: string; html: string }> {
    if (part.tag === '@link') {
        const href = resolveInlineHref(part, context);
        if (href) {
            const sanitizedHref = escapeAttribute(sanitizeInternalHref(href));
            const rawLabel = typeof part.text === 'string' ? part.text : href;
            const external = /^https?:\/\//i.test(href);

            try {
                const linkMarkdown = `[${rawLabel}](${href})`;
                const highlighted = (await highlightInlineToHtml(linkMarkdown, DEFAULT_INLINE_LANG)) ?? null;

                if (highlighted) {
                    return { plain: rawLabel, html: highlighted };
                }
            } catch {
                // fallthrough to simple anchor fallback below
            }

            const escapedLabel = escapeHtml(rawLabel);
            const attrs = external ? ' target="_blank" rel="noreferrer noopener"' : '';

            return {
                plain: rawLabel,
                html: `<a href="${sanitizedHref}"${attrs}>${escapedLabel}</a>`
            };
        }
    }

    const fallbackLabel = typeof part.text === 'string' ? part.text : '';
    return { plain: fallbackLabel, html: escapeHtml(fallbackLabel) };
}
