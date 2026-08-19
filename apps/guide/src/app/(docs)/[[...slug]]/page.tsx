import { cn } from '@seedcord/ui';
import { notFound } from 'next/navigation';

import { mdxComponents } from '#lib/mdxComponents';
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
            <h1 className={cn('font-display text-4xl/tight font-semibold text-(--text)')}>{page.data.title}</h1>
            {page.data.description ? (
                <p className={cn('mt-3 text-lg/relaxed text-(--text-muted)')}>{page.data.description}</p>
            ) : null}
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

    return { title: page.data.title, description: page.data.description };
}
