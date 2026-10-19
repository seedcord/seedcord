import { cn, serializeJsonLd } from '@seedcord/ui';
import { PreviewCard } from '@seedcord/ui/LinkPreview';
import { ComponentEmbed } from 'discord-component-embed/react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { mdxComponents } from '#components/blog/mdxComponents';
import { Byline, PostDates } from '#components/blog/PostMeta';
import { Footer } from '#components/home/Footer';
import { Nav } from '#components/home/Nav';
import { linkTarget } from '#components/ui/linkTarget';
import { PosterButton } from '#components/ui/PosterButton';
import { slugOf, summarize } from '#lib/blog/post';
import { postJsonLd, postMetadata } from '#lib/blog/seo';
import { blog } from '#lib/blog/source';
import { postPreview } from '#lib/linkPreview';

import type { PostSummary } from '#lib/blog/post';
import type { BlogPost } from '#lib/blog/source';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

interface PostParams {
    params: Promise<{ slug: string }>;
}

// the dev server crashes on a slug generateStaticParams never listed
export const dynamicParams = false;

function PostHeader({ post }: { post: PostSummary }): ReactNode {
    return (
        <header className={cn('border-b-[3px] border-(--seed-dark)')}>
            <div className={cn('mx-auto flex max-w-3xl flex-col items-start gap-6 px-5 pt-12 pb-10 lg:pt-16')}>
                <PosterButton href="/blog" variant="ink">
                    ← blog
                </PosterButton>
                <h1
                    className={cn(
                        'font-display text-[clamp(2.4rem,5.6vw,4rem)] leading-[0.95] font-semibold tracking-tight text-(--seed-dark)'
                    )}
                >
                    {post.title}
                </h1>
                <p className={cn('text-lg/snug font-medium text-(--seed-dark)/80 md:text-xl/snug')}>
                    {post.description}
                </p>
                <div
                    className={cn(
                        'flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t-[1.5px] border-(--seed-dark)/15 pt-5 text-(--seed-dark)/70'
                    )}
                >
                    <Byline authors={post.authors} />
                    <PostDates created={post.created} edited={post.edited} minutes={post.minutes} />
                </div>
            </div>
        </header>
    );
}

function pageFor(slug: string): BlogPost {
    const page = blog.getPage([slug]);
    if (!page) notFound();
    return page;
}

export async function generateMetadata({ params }: PostParams): Promise<Metadata> {
    return postMetadata(await summarize(pageFor((await params).slug)));
}

export default async function PostPage({ params }: PostParams): Promise<ReactNode> {
    const page = pageFor((await params).slug);
    const post = await summarize(page);
    const Body = page.data.body;

    return (
        <>
            <ComponentEmbed>
                <PreviewCard {...postPreview(post)} />
            </ComponentEmbed>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(postJsonLd(post)) }}
            />
            <Nav current="Blog" />
            <main id="main-content">
                <article>
                    <PostHeader post={post} />
                    <div className={cn('mx-auto flex max-w-3xl flex-col gap-6 px-5 py-12 lg:py-16')}>
                        {post.cover ? (
                            <Image
                                src={post.cover.src}
                                width={post.cover.width}
                                height={post.cover.height}
                                alt={post.cover.alt}
                                priority
                                className={cn('rule blk-rind mb-4 h-auto w-full rounded-sm')}
                            />
                        ) : null}
                        <Body components={mdxComponents} />
                    </div>
                    <footer
                        className={cn(
                            'mx-auto flex max-w-3xl flex-wrap justify-between gap-4 px-5 pb-16 text-sm font-semibold'
                        )}
                    >
                        <Link href="/blog" className={cn('hover:text-(--flesh-deep)')}>
                            ← all posts
                        </Link>
                        <Link
                            href={post.editUrl}
                            {...linkTarget(post.editUrl)}
                            className={cn('hover:text-(--flesh-deep)')}
                        >
                            Edit this post on GitHub
                        </Link>
                    </footer>
                </article>
            </main>
            <Footer />
        </>
    );
}

export function generateStaticParams(): { slug: string }[] {
    return blog.getPages().map((page) => ({ slug: slugOf(page) }));
}
