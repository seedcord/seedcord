import { escapeHtml } from './cleaners';

import type { CommentParagraph, FormatContext } from '@lib/docs/types';
import type { VersionedDocsEngine } from '@seedcord/docs-engine';

export function createPlainParagraph(text: string): CommentParagraph {
    const normalized = text.trim();
    return { plain: normalized, html: escapeHtml(normalized) } satisfies CommentParagraph;
}

export const cloneCommentParagraphs = (
    paragraphs: readonly CommentParagraph[] | null | undefined
): CommentParagraph[] => (paragraphs?.length ? [...paragraphs] : []);

export const createFormatContext = (engine: VersionedDocsEngine, manifestPackage: string): FormatContext => ({
    engine,
    manifestPackage
});
