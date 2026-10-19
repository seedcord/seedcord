import { cn, serializeJsonLd } from '@seedcord/ui';
import { PreviewCard } from '@seedcord/ui/LinkPreview';
import { ComponentEmbed } from 'discord-component-embed/react';
import Image from 'next/image';
import Link from 'next/link';

import { mdxComponents } from '#components/blog/mdxComponents';
import { Byline, PostDates } from '#components/blog/PostMeta';
import { Footer } from '#components/home/Footer';
import { Nav } from '#components/home/Nav';
import { SiteLink } from '#components/ui/SiteLink';
import { BLOG_PATH } from '#lib/blog/paths';
import { postFromParams, postParams, summaryFromParams } from '#lib/blog/posts';
import { postJsonLd, postMetadata } from '#lib/blog/seo';
import { postPreview } from '#lib/linkPreview';

import type { PostSummary } from '#lib/blog/summary';
import type { PostParams } from '#lib/blog/posts';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// without this, next dev crashes on a slug that generateStaticParams did not return
export const dynamicParams = false;

function PostHeader({ post }: { post: PostSummary }): ReactNode {
    return (
        <header className={cn('border-b-[3px] border-(--seed-dark)')}>
            <div className={cn('mx-auto flex max-w-3xl flex-col items-start gap-6 px-5 pt-12 pb-10 lg:pt-16')}>
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

export const generateStaticParams = postParams;

export async function generateMetadata(route: PostParams): Promise<Metadata> {
    return postMetadata(await summaryFromParams(route));
}

export default async function PostPage(route: PostParams): Promise<ReactNode> {
    const page = await postFromParams(route);
    const post = await page.summary();
    const Body = page.body;

    return (
        <>
            <ComponentEmbed>
                <PreviewCard {...postPreview(post)} />
            </ComponentEmbed>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(postJsonLd(post)) }}
            />
            <Nav />
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
                                preload
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
                        <Link href={BLOG_PATH} className={cn('hover:text-(--flesh-deep)')}>
                            ← all posts
                        </Link>
                        <SiteLink href={post.editUrl} className={cn('hover:text-(--flesh-deep)')}>
                            Edit this post on GitHub
                        </SiteLink>
                    </footer>
                </article>
            </main>
            <Footer />
        </>
    );
}
