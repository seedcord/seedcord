import { notFound } from 'next/navigation';

import { slugOf } from '#lib/blog/post';
import { blog } from '#lib/blog/source';
import { postMarkdown } from '#lib/blog/twin';

export const dynamic = 'force-static';
export const dynamicParams = false;

interface TwinParams {
    params: Promise<{ slug: string }>;
}

export function generateStaticParams(): { slug: string }[] {
    return blog.getPages().map((page) => ({ slug: slugOf(page) }));
}

export async function GET(_request: Request, { params }: TwinParams): Promise<Response> {
    const page = blog.getPage([(await params).slug]);
    if (!page) notFound();

    return new Response(await postMarkdown(page), { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
}
