import type { CommentParagraph } from '@lib/docs/types';
import type { ReactElement } from 'react';

export function renderParagraphNode(paragraph: CommentParagraph, key: string): ReactElement {
    return paragraph.html ? (
        <p key={key} dangerouslySetInnerHTML={{ __html: paragraph.html }} />
    ) : (
        <p key={key}>{paragraph.plain}</p>
    );
}
