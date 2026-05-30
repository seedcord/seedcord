import { cn } from '@seedcord/ui';

import type { CommentParagraph } from '@lib/docs/types';
import type { ReactElement } from 'react';

interface CommentParagraphsProps {
    paragraphs: readonly CommentParagraph[];
    className?: string;
    paragraphClassName?: string;
}

export function CommentParagraphs({
    paragraphs,
    className,
    paragraphClassName
}: CommentParagraphsProps): ReactElement | null {
    const entries = paragraphs.filter((paragraph) => paragraph.html || paragraph.plain);
    if (entries.length === 0) {
        return null;
    }

    return (
        <div className={cn('text-subtle space-y-2 text-sm/relaxed', className)}>
            {entries.map((paragraph, index) => {
                const key = `${index}-${paragraph.html || paragraph.plain || 'empty'}`;
                if (paragraph.html) {
                    return (
                        <div
                            key={key}
                            className={cn('min-w-0 [&_p+p]:mt-2', paragraphClassName)}
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
