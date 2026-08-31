import { cn } from '@seedcord/ui';
import { notFound } from 'next/navigation';

import { CopyPageButton } from '#components/CopyPageButton';
import { mdxComponents } from '#lib/mdxComponents';
import { assetPath, TWIN } from '#lib/pageAssets';
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

    return (
        <article>
            <div className={cn('flex flex-col items-start gap-1')}>
                <div className={cn('min-w-0')}>
                    <h1 className={cn('font-display text-4xl/tight font-semibold text-(--text)')}>{page.data.title}</h1>
                    {page.data.description ? (
                        <p className={cn('mt-3 text-lg/relaxed text-(--text-muted)')}>{page.data.description}</p>
                    ) : null}
                </div>
                {/* the button's own px-3 would inset it from the content column */}
                <CopyPageButton
                    source={assetPath(page.url, TWIN)}
                    className={cn('order-first -me-3 -mt-6 flex-row-reverse self-end lg:hidden')}
                />
            </div>
            <div className={cn('mt-10 flex flex-col gap-5')}>
                <MDX components={mdxComponents} />
            </div>
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

    return pageMetadata({ title: page.data.title, description: page.data.description, path: page.url });
}
