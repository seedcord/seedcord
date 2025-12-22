import { cn } from '@lib/utils';

import type { CommentParagraph } from '@lib/docs/types';
import type { ReactElement } from 'react';

interface CommentParagraphsProps {
    paragraphs: readonly CommentParagraph[];
    className?: string;
    paragraphClassName?: string;
}

function CommentParagraphs({ paragraphs, className, paragraphClassName }: CommentParagraphsProps): ReactElement | null {
    const entries = paragraphs.filter((paragraph) => paragraph.html || paragraph.plain);
    if (entries.length === 0) {
        return null;
    }

    return (
        <div className={cn('text-subtle space-y-2 text-sm leading-relaxed', className)}>
            {entries.map((paragraph, index) => {
                const key = paragraph.html || paragraph.plain || `paragraph-${index}`;
                if (paragraph.html) {
                    return (
                        <p
                            key={key}
                            className={cn('min-w-0', paragraphClassName)}
                            dangerouslySetInnerHTML={{ __html: paragraph.html }}
                        />
                    );
                }

                return (
                    <p key={key} className={cn('min-w-0', paragraphClassName)}>
                        {paragraph.plain}
                    </p>
                );
            })}
        </div>
    );
}

export default CommentParagraphs;
