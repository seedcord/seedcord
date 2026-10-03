import { cn, CopyAnchorButton } from '@seedcord/ui';
import { notFound } from 'next/navigation';

import { PageActions } from '#components/PageActions';
import { PageNav } from '#components/PageNav';
import { ANCHOR, ANCHOR_DROP, ANCHOR_SIZE, mdxComponents } from '#lib/mdxComponents';
import { guidePreview } from '#lib/linkPreview';
import { guideOrder } from '#lib/nav';
import { PreviewCard } from '@seedcord/ui/link-preview';
import { ComponentEmbed } from 'discord-component-embed/react';
import { neighboursOf } from '#lib/neighbours';
import { pillFor } from '#lib/og/card';
import { pageActionsFor } from '#lib/pageActions';
import { pageMetadata } from '#lib/site';
import { source } from '#lib/source';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

interface PageParams {
    params: Promise<{ slug?: string[] }>;
}

export default async function Page(props: PageParams): Promise<ReactNode> {
    const { slug } = await props.params;
    const page = source.getPage(slug);
    if (!page) notFound();

    const MDX = page.data.body;
    const order = guideOrder();
    const { previous, next } = neighboursOf(order, page.url);
    const twinMarkdown = await page.data.getText('processed');

    return (
        <article>
            <ComponentEmbed>
                <PreviewCard {...guidePreview({ page, order, twinMarkdown })} />
            </ComponentEmbed>
            <div className={cn('flex flex-col items-start gap-1')}>
                <div className={cn('min-w-0')}>
                    <div className={cn('group text-4xl/tight')}>
                        <h1 className={cn('font-display inline font-semibold text-(--text)')}>{page.data.title}</h1>
                        <CopyAnchorButton
                            label={page.data.title}
                            iconSize={ANCHOR_SIZE.h1}
                            className={cn(ANCHOR, ANCHOR_DROP.h1)}
                        />
                    </div>
                    {page.data.description ? (
                        <p className={cn('mt-3 text-lg/relaxed text-(--text-muted)')}>{page.data.description}</p>
                    ) : null}
                </div>
                {/* the button's own px-3 would inset it from the content column */}
                <PageActions {...pageActionsFor(page)} className={cn('order-first -me-3 -mt-6 self-end lg:hidden')} />
            </div>
            <div className={cn('mt-10 flex flex-col gap-5')}>
                <MDX components={mdxComponents} />
            </div>
            <PageNav previous={previous} next={next} />
        </article>
    );
}

export function generateStaticParams(): { slug?: string[] }[] {
    return source.generateParams();
}

export async function generateMetadata(props: PageParams): Promise<Metadata> {
    const { slug } = await props.params;
    const page = source.getPage(slug);
    if (!page) notFound();

    return pageMetadata({
        title: page.data.title,
        description: page.data.description,
        path: page.url,
        pill: pillFor(page)
    });
}
