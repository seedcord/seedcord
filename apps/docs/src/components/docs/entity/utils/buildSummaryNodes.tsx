import { renderParagraphNode } from './renderers/renderParagraphNode';

import type { CommentParagraph } from '@lib/docs/types';
import type { ReactElement } from 'react';

export function buildSummaryNodes(paragraphs: readonly CommentParagraph[], fallback: string): ReactElement[] {
    const entries = paragraphs.filter((paragraph) => paragraph.html || paragraph.plain);
    const [lead, ...rest] = entries;

    const content: ReactElement[] = [];

    if (lead) {
        content.push(renderParagraphNode(lead, lead.html || lead.plain || 'summary-lead'));
    } else {
        content.push(
            renderParagraphNode({ plain: fallback, html: fallback } satisfies CommentParagraph, 'summary-fallback')
        );
    }

    rest.forEach((paragraph, index) => {
        content.push(renderParagraphNode(paragraph, paragraph.html || paragraph.plain || `summary-${index}`));
    });

    return content;
}
