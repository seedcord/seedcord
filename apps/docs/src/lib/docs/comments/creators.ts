import { escapeHtml } from './cleaners';

import type { ParagraphAccumulator, CommentParagraph, FormatContext } from '../types';
import type { DocsEngine } from '@seedcord/docs-engine';

export function createParagraphAccumulator(): ParagraphAccumulator {
    let plainBuffer = '';
    let htmlBuffer = '';
    const paragraphs: CommentParagraph[] = [];

    const push = (): void => {
        if (!plainBuffer && !htmlBuffer) {
            return;
        }

        const plain = plainBuffer.replace(/\s+/g, ' ').trim();
        const html = htmlBuffer.trim();

        if (plain || html) {
            paragraphs.push({ plain, html });
        }

        plainBuffer = '';
        htmlBuffer = '';
    };
    return {
        append(plain, html) {
            if (plain) {
                if (plainBuffer && !/\s$/.test(plainBuffer) && !/^\s/.test(plain)) {
                    plainBuffer += ' ';
                }
                plainBuffer += plain;
            }
            if (html) {
                if (htmlBuffer && !/\s$/.test(htmlBuffer) && !/^\s/.test(html)) {
                    htmlBuffer += ' ';
                }
                htmlBuffer += html;
            }
        },
        breakParagraph() {
            push();
        },
        toParagraphs() {
            push();
            return paragraphs.slice();
        }
    } satisfies ParagraphAccumulator;
}

export function createPlainParagraph(text: string): CommentParagraph {
    const normalized = text.trim();
    return { plain: normalized, html: escapeHtml(normalized) } satisfies CommentParagraph;
}

export const cloneCommentParagraphs = (
    paragraphs: readonly CommentParagraph[] | null | undefined
): CommentParagraph[] => (paragraphs?.length ? [...paragraphs] : []);

export const createFormatContext = (engine: DocsEngine, manifestPackage: string): FormatContext => ({
    engine,
    manifestPackage
});
