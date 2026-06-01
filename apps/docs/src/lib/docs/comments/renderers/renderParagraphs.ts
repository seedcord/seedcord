import { marked } from 'marked';

import { sanitizeHtml } from '@lib/sanitizeHtml';
import { highlightToHtml, highlightInlineToHtml } from '@lib/shiki';

import { resolveInlineHref } from '../resolvers';

import type { FormatContext, CommentParagraph, CommentDisplayPart } from '../../types';
import type { DocComment } from '@seedcord/docs-engine';

marked.use({
    async: true,
    walkTokens: async (token) => {
        if (token.type === 'code') {
            const html = await highlightToHtml(token.text, token.lang);
            if (html) {
                Object.assign(token, { type: 'html', text: html });
            }
        } else if (token.type === 'codespan') {
            const html = await highlightInlineToHtml(token.text);
            if (html) {
                Object.assign(token, { type: 'html', text: html });
            }
        }
    }
});

export async function renderParagraphs(comment: DocComment, context: FormatContext): Promise<CommentParagraph[]> {
    const parts = collectSummaryParts(comment);
    if (!parts.length) {
        return [];
    }

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

    const html = sanitizeHtml(await marked.parse(markdown, { async: true }));

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
