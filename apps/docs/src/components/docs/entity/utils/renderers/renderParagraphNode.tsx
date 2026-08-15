import { cn } from '@seedcord/ui';

import type { CommentParagraph } from '#lib/docs/types';
import type { ReactElement } from 'react';

export function renderParagraphNode(paragraph: CommentParagraph, key: string): ReactElement {
    return paragraph.html ? (
        <div key={key} className={cn('[&_p+p]:mt-2')} dangerouslySetInnerHTML={{ __html: paragraph.html }} />
    ) : (
        <p key={key}>{paragraph.plain}</p>
    );
}
