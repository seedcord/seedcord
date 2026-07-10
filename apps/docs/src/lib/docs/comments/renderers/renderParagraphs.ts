import { marked } from 'marked';

import { resolveInlineHref } from '@lib/docs/comments/resolvers';
import { sanitizeHtml } from '@lib/sanitizeHtml';
import { highlightToHtml, highlightInlineToHtml } from '@lib/shiki';

import { decorateProseLinks } from './decorateProseLinks';

import type { FormatContext, CommentParagraph, CommentDisplayPart } from '@lib/docs/types';
import type { DocComment } from '@seedcord/docs-engine';
import type { Tokens } from 'marked';
import type { BundledLanguage } from 'shiki';

marked.use({
    async: true,
    walkTokens: async (token) => {
        if (token.type === 'code') {
            // Narrow token type from any. Shiki validates language at runtime.
            const { text, lang } = token as Tokens.Code;
            const html = await highlightToHtml(text, lang as BundledLanguage | undefined);
            if (html) {
                Object.assign(token, { type: 'html', text: html });
            }
        } else if (token.type === 'codespan') {
            const { text } = token as Tokens.Codespan;
            const html = await highlightInlineToHtml(text);
            if (html) {
                Object.assign(token, { type: 'html', text: html });
            }
        }
    }
});

/** Assembles the markdown for a run of comment parts, resolving `{@link}` parts to a markdown link. */
export function partsToMarkdown(parts: readonly CommentDisplayPart[], context: FormatContext): string {
    let markdown = '';

    for (const part of parts) {
        switch (part.kind) {
            case 'text':
                markdown += part.text;
                break;
            case 'code':
                markdown += `\`${part.text}\``;
                break;
            case 'inline-tag': {
                if (part.tag === '@link' || part.tag === '@linkcode' || part.tag === '@linkplain') {
                    const href = resolveInlineHref(part, context);
                    const label = (part.text || href) ?? '';
                    if (href) {
                        markdown += `[\`${label}\`](${href})`;
                    } else {
                        markdown += label;
                    }
                } else {
                    markdown += part.text || '';
                }
                break;
            }
            default:
                break;
        }
    }

    return markdown;
}

export async function renderParagraphs(comment: DocComment, context: FormatContext): Promise<CommentParagraph[]> {
    const parts = collectSummaryParts(comment);
    if (!parts.length) {
        return [];
    }

    const markdown = partsToMarkdown(parts, context);
    const parsed = await marked.parse(markdown, { async: true });
    const html = sanitizeHtml(decorateProseLinks(parsed, context.manifestPackage));

    return [
        {
            plain: markdown,
            html: html
        }
    ];
}

function collectSummaryParts(comment: DocComment): CommentDisplayPart[] {
    const parts: CommentDisplayPart[] = [];

    if (comment.summaryParts.length) {
        parts.push(...comment.summaryParts);
    } else if (comment.summary.length) {
        parts.push({ kind: 'text', text: comment.summary });
    }

    const remarksTag = comment.blockTags.find((t) => t.tag === '@remarks');
    if (remarksTag) {
        if (parts.length > 0) {
            parts.push({ kind: 'text', text: '\n\n' });
        }
        parts.push(...remarksTag.content);
    }

    return parts;
}
