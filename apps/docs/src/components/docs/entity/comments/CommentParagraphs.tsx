import { cn } from '@seedcord/ui';

import type { CommentParagraph } from '#lib/docs/types';
import type { ReactElement } from 'react';

// two paragraphs of one comment can read identically. the text alone would collide as a key
function keyed(paragraphs: readonly CommentParagraph[]): { key: string; paragraph: CommentParagraph }[] {
    const seen = new Map<string, number>();

    return paragraphs.map((paragraph) => {
        const text = paragraph.html || paragraph.plain || 'empty';
        const nth = seen.get(text) ?? 0;
        seen.set(text, nth + 1);
        return { key: `${text}#${String(nth)}`, paragraph };
    });
}

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
                {keyed(entries).map(({ key, paragraph }) =>
                    // flatten the marked `<p>` wrapper to keep the bullet level with the first line
                    paragraph.html ? (
                        <li
                            key={key}
                            className={cn('min-w-0 [&>p]:m-0', paragraphClassName)}
                            dangerouslySetInnerHTML={{ __html: paragraph.html }}
                        />
                    ) : (
                        <li key={key} className={cn('min-w-0', paragraphClassName)}>
                            {paragraph.plain}
                        </li>
                    )
                )}
            </ul>
        );
    }

    return (
        <div className={cn('text-subtle space-y-2 text-sm/relaxed', className)}>
            {keyed(entries).map(({ key, paragraph }) =>
                paragraph.html ? (
                    <div
                        key={key}
                        className={cn('min-w-0 [&_p+p]:mt-2', paragraphClassName)}
                        dangerouslySetInnerHTML={{ __html: paragraph.html }}
                    />
                ) : (
                    <p key={key} className={cn('min-w-0', paragraphClassName)}>
                        {paragraph.plain}
                    </p>
                )
            )}
        </div>
    );
}
