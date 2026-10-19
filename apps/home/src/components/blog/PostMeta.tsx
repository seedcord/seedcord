import { cn } from '@seedcord/ui';
import { readTimeLabel } from '@seedcord/ui/readingTime';
import Image from 'next/image';

import { SiteLink } from '#components/ui/SiteLink';
import { formatPostDate, listSeparators } from '#lib/blog/summary';

import { Fragment } from 'react';

import type { PostAuthor, PostSummary } from '#lib/blog/summary';
import type { ReactNode } from 'react';

const AVATAR_PX = 28;
// twice the drawn size, for high-density screens
const avatarUrl = (github: string): string => `${github}.png?size=${AVATAR_PX * 2}`;

interface BylineProps {
    authors: readonly PostAuthor[];
    className?: string;
}

export function Byline({ authors, className }: BylineProps): ReactNode {
    const separators = listSeparators(authors.map((author) => author.name));

    return (
        <span className={cn('flex items-center gap-2.5', className)}>
            <span aria-hidden className={cn('flex shrink-0 -space-x-2')}>
                {authors.map((author) => (
                    <Image
                        key={author.handle}
                        src={avatarUrl(author.github)}
                        alt=""
                        width={AVATAR_PX}
                        height={AVATAR_PX}
                        className={cn(
                            'size-7 rounded-full border-2 border-(--seed-dark) bg-(--pith) ring-2 ring-(--pith)'
                        )}
                    />
                ))}
            </span>
            <span>
                {authors.map((author, at) => (
                    <Fragment key={author.handle}>
                        <SiteLink
                            href={author.url}
                            className={cn('font-semibold text-(--seed-dark) hover:text-(--flesh-deep)')}
                        >
                            {author.name}
                        </SiteLink>
                        {separators[at]}
                    </Fragment>
                ))}
            </span>
        </span>
    );
}

type MetaProps = Pick<PostSummary, 'created' | 'edited' | 'minutes'> & { className?: string };

const DOT = (
    <span aria-hidden className={cn('hidden sm:inline')}>
        ·
    </span>
);

export function PostDates({ created, edited, minutes, className }: MetaProps): ReactNode {
    return (
        <span className={cn('flex flex-wrap gap-x-2 gap-y-1 text-sm font-medium', className)}>
            <time dateTime={created} className={cn('whitespace-nowrap')}>
                {formatPostDate(created)}
            </time>
            {edited === undefined ? null : (
                <>
                    {DOT}
                    <span className={cn('whitespace-nowrap')}>
                        edited <time dateTime={edited}>{formatPostDate(edited)}</time>
                    </span>
                </>
            )}
            {DOT}
            <span className={cn('whitespace-nowrap')}>{readTimeLabel(minutes)}</span>
        </span>
    );
}
