import { cn } from '@seedcord/ui';
import Image from 'next/image';

import { linkTarget } from '#components/ui/linkTarget';
import { formatPostDate, joinListParts } from '#lib/blog/post';

import type { PostAuthor, PostSummary } from '#lib/blog/post';
import type { ReactNode } from 'react';

const AVATAR_PX = 28;

function AuthorName({ author }: { author: PostAuthor | undefined }): ReactNode {
    if (author === undefined) return null;

    return (
        <a
            href={author.url}
            {...linkTarget(author.url)}
            className={cn('font-semibold text-(--seed-dark) hover:text-(--flesh-deep)')}
        >
            {author.name}
        </a>
    );
}

export function Byline({ authors }: { authors: readonly PostAuthor[] }): ReactNode {
    return (
        <span className={cn('flex items-center gap-2.5')}>
            <span aria-hidden className={cn('flex shrink-0 -space-x-2')}>
                {authors.map((author) => (
                    <Image
                        key={author.handle}
                        src={author.avatar}
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
                {joinListParts(authors.length).map((part, at, parts) =>
                    part.type === 'element' ? (
                        <AuthorName key={part.value} author={authors[Number(part.value)]} />
                    ) : (
                        <span key={`after-${parts[at - 1]?.value ?? ''}`}>{part.value}</span>
                    )
                )}
            </span>
        </span>
    );
}

type MetaProps = Pick<PostSummary, 'created' | 'edited' | 'minutes'>;

const DOT = (
    <span aria-hidden className={cn('hidden sm:inline')}>
        ·
    </span>
);

export function PostDates({ created, edited, minutes }: MetaProps): ReactNode {
    return (
        <span className={cn('flex flex-wrap gap-x-2 gap-y-1 text-sm font-medium')}>
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
            <span className={cn('whitespace-nowrap')}>{minutes} min read</span>
        </span>
    );
}
