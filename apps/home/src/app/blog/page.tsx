import { cn, MAIN_CONTENT_ID, serializeJsonLd } from '@seedcord/ui';
import { PreviewCard } from '@seedcord/ui/LinkPreview';
import { ComponentEmbed } from 'discord-component-embed/react';
import { Rss } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Byline, PostDates } from '#components/blog/PostMeta';
import { Footer } from '#components/home/Footer';
import { Nav } from '#components/home/Nav';
import { SECTION_HEADING_LG, Section } from '#components/home/Section';
import { PosterButton } from '#components/ui/PosterButton';
import { BLOG_DESCRIPTION } from '#lib/blog/about';
import { listedPosts } from '#lib/blog/posts';
import { FEED_PATH } from '#lib/blog/paths';
import { BLOG_METADATA, blogJsonLd } from '#lib/blog/seo';
import { BLOG_PREVIEW } from '#lib/linkPreview';

import type { PostSummary } from '#lib/blog/summary';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = BLOG_METADATA;

function PostRow({ post }: { post: PostSummary }): ReactNode {
    return (
        <li className={cn('group relative grid gap-6 p-5 sm:p-7 md:grid-cols-[1fr_16rem] md:items-center')}>
            <div className={cn('flex min-w-0 flex-col gap-3')}>
                <PostDates
                    created={post.created}
                    edited={post.edited}
                    minutes={post.minutes}
                    className={cn('text-(--flesh-deep)')}
                />
                <h2
                    className={cn(
                        'font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-[1.05] font-semibold tracking-tight text-(--seed-dark) group-hover:text-(--flesh-deep)'
                    )}
                >
                    <Link href={post.url} className={cn('after:absolute after:inset-0')}>
                        {post.title}
                    </Link>
                </h2>
                <p className={cn('text-base/relaxed text-(--seed-dark)/75 sm:text-lg/relaxed')}>{post.description}</p>
                <Byline authors={post.authors} className={cn('relative z-10 w-fit text-sm')} />
            </div>
            {post.thumbnail ? (
                <Image
                    src={post.thumbnail.src}
                    width={post.thumbnail.width}
                    height={post.thumbnail.height}
                    alt=""
                    className={cn('rule hidden aspect-video w-full rounded-sm object-cover md:block')}
                />
            ) : null}
        </li>
    );
}

export default async function BlogPage(): Promise<ReactNode> {
    const posts = await listedPosts();

    return (
        <>
            <ComponentEmbed>
                <PreviewCard {...BLOG_PREVIEW} />
            </ComponentEmbed>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(blogJsonLd(posts)) }}
            />
            <Nav onBlogIndex />
            <main id={MAIN_CONTENT_ID}>
                <Section ground="pith">
                    <div className={cn('grid grid-cols-[1fr_auto] gap-x-6')}>
                        <h1 className={cn(SECTION_HEADING_LG)}>
                            The <span className={cn('text-(--flesh-deep)')}>blog.</span>
                        </h1>
                        <PosterButton
                            href={FEED_PATH}
                            variant="ink"
                            wrapperClassName={cn(
                                'self-center justify-self-end sm:col-start-2 sm:row-start-2 sm:self-end'
                            )}
                        >
                            <Rss aria-hidden className={cn('size-4')} />
                            RSS
                        </PosterButton>
                        <p
                            className={cn(
                                'col-span-2 mt-5 max-w-2xl text-lg/snug font-medium text-(--seed-dark)/80 sm:col-span-1 sm:col-start-1 sm:row-start-2 md:text-xl/snug'
                            )}
                        >
                            {BLOG_DESCRIPTION}
                        </p>
                    </div>
                    {posts.length === 0 ? (
                        <p className={cn('rule blk mt-10 rounded-sm p-7 text-(--seed-dark)/70')}>
                            The first post is on its way.
                        </p>
                    ) : (
                        <ol className={cn('rule blk mt-10 divide-y divide-(--seed-dark)/10 rounded-sm bg-(--pith)')}>
                            {posts.map((post) => (
                                <PostRow key={post.slug} post={post} />
                            ))}
                        </ol>
                    )}
                </Section>
            </main>
            <Footer />
        </>
    );
}
