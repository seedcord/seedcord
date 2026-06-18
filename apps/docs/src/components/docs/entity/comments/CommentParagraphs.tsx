import { cn } from '@seedcord/ui';

import type { CommentParagraph } from '@lib/docs/types';
import type { ReactElement } from 'react';

interface CommentParagraphsProps {
    paragraphs: readonly CommentParagraph[];
    className?: string;
    paragraphClassName?: string;
    isList?: boolean;
}

export function CommentParagraphs({
    paragraphs,
    className,
    paragraphClassName,
    isList: list = false
}: CommentParagraphsProps): ReactElement | null {
    const entries = paragraphs.filter((paragraph) => paragraph.html || paragraph.plain);
    if (entries.length === 0) {
        return null;
    }

    if (list) {
        return (
            <ul className={cn('text-subtle list-disc space-y-1 pl-5 text-sm/relaxed', className)}>
                {entries.map((paragraph, index) => {
                    const key = `${index}-${paragraph.html || paragraph.plain || 'empty'}`;
                    // flatten the marked `<p>` wrapper so the bullet sits on the text's first line
                    return paragraph.html ? (
                        <li
                            key={key}
                            className={cn('min-w-0 [&>p]:m-0', paragraphClassName)}
                            dangerouslySetInnerHTML={{ __html: paragraph.html }}
                        />
                    ) : (
                        <li key={key} className={cn('min-w-0', paragraphClassName)}>
                            {paragraph.plain}
                        </li>
                    );
                })}
            </ul>
        );
    }

    return (
        <div className={cn('text-subtle space-y-2 text-sm/relaxed', className)}>
            {entries.map((paragraph, index) => {
                const key = `${index}-${paragraph.html || paragraph.plain || 'empty'}`;
                return paragraph.html ? (
                    <div
                        key={key}
                        className={cn('min-w-0 [&_p+p]:mt-2', paragraphClassName)}
                        dangerouslySetInnerHTML={{ __html: paragraph.html }}
                    />
                ) : (
                    <p key={key} className={cn('min-w-0', paragraphClassName)}>
                        {paragraph.plain}
                    </p>
                );
            })}
        </div>
    );
}
