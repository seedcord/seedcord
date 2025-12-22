import { highlightInlineToHtml } from '../../../shiki';
import { normalizeInlineCode, escapeHtml } from '../cleaners';
import { DOUBLE_NEWLINE, DEFAULT_INLINE_LANG } from '../constants';
import { createParagraphAccumulator } from '../creators';
import { renderInlineTag } from './renderInlineTag';

import type { FormatContext, CommentParagraph, CommentDisplayPart, ParagraphAccumulator } from '../../types';
import type { DocComment } from '@seedcord/docs-engine';

export async function renderParagraphs(comment: DocComment, context: FormatContext): Promise<CommentParagraph[]> {
    const parts = collectSummaryParts(comment);
    if (!parts.length) {
        return [];
    }

    const accumulator = createParagraphAccumulator();

    for (const part of parts) {
        await appendPart(part, accumulator, context);
    }

    return accumulator.toParagraphs();
}

// helpers

async function appendPart(
    part: CommentDisplayPart,
    accumulator: ParagraphAccumulator,
    context: FormatContext
): Promise<void> {
    switch (part.kind) {
        case 'text': {
            const text = typeof part.text === 'string' ? part.text : '';
            if (!text) return;
            const segments = text.split(DOUBLE_NEWLINE);

            segments.forEach((segment, index) => {
                if (index > 0) {
                    accumulator.breakParagraph();
                }
                const rendered = convertSingleNewlines(segment);
                accumulator.append(rendered.plain, rendered.html);
            });
            return;
        }
        case 'code': {
            const raw = normalizeInlineCode(typeof part.text === 'string' ? part.text : '');
            if (!raw) return;

            const highlighted =
                (await highlightInlineToHtml(raw, DEFAULT_INLINE_LANG)) ?? `<code>${escapeHtml(raw)}</code>`;
            accumulator.append(raw, highlighted);
            return;
        }
        case 'inline-tag': {
            const rendered = await renderInlineTag(part, context);
            accumulator.append(rendered.plain, rendered.html);
            return;
        }
        default: {
            const fallback = part.text;
            if (!fallback) return;
            const segments = fallback.split(DOUBLE_NEWLINE);
            segments.forEach((segment, index) => {
                if (index > 0) {
                    accumulator.breakParagraph();
                }
                const rendered = convertSingleNewlines(segment);
                accumulator.append(rendered.plain, rendered.html);
            });
        }
    }
}

export function convertSingleNewlines(segment: string): { plain: string; html: string } {
    if (!segment) {
        return { plain: '', html: '' };
    }
    const plain = segment.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    const html = escapeHtml(segment).replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    return { plain, html };
}
export function collectSummaryParts(comment: DocComment): CommentDisplayPart[] {
    if (comment.summaryParts.length) {
        return comment.summaryParts;
    }

    if (comment.summary.length) {
        return [{ kind: 'text', text: comment.summary }];
    }

    return [];
}
