import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
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
        <DocsPage toc={page.data.toc} full={page.data.full}>
            <DocsTitle>{page.data.title}</DocsTitle>
            <DocsDescription>{page.data.description}</DocsDescription>
            <DocsBody>
                <MDX components={mdxComponents} />
            </DocsBody>
        </DocsPage>
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
