import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { notFound } from 'next/navigation';

import { postFolder, slugOf } from '#lib/blog/post';
import { blog } from '#lib/blog/source';

export const dynamic = 'force-static';
export const dynamicParams = false;

interface ImageParams {
    params: Promise<{ slug: string; image: string }>;
}

const isWebp = (name: string): boolean => name.endsWith('.webp');

export function generateStaticParams(): { slug: string; image: string }[] {
    return blog
        .getPages()
        .flatMap((page) =>
            readdirSync(postFolder(page)).flatMap((image) => (isWebp(image) ? [{ slug: slugOf(page), image }] : []))
        );
}

export async function GET(_request: Request, { params }: ImageParams): Promise<Response> {
    const { slug, image } = await params;
    const page = blog.getPage([slug]);
    if (!page || !isWebp(image) || path.basename(image) !== image) notFound();

    return new Response(readFileSync(path.join(postFolder(page), image)), {
        headers: { 'content-type': 'image/webp' }
    });
}
