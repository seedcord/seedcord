import { readFileSync } from 'node:fs';
import path from 'node:path';

import { allPosts, postFromParams } from '#lib/blog/posts';

export const dynamic = 'force-static';
export const dynamicParams = false;

interface ImageParams {
    params: Promise<{ slug: string; image: string }>;
}

export function generateStaticParams(): { slug: string; image: string }[] {
    return allPosts().flatMap((post) => post.images().map((image) => ({ slug: post.slug, image })));
}

export async function GET(_request: Request, route: ImageParams): Promise<Response> {
    const post = await postFromParams(route);
    const { image } = await route.params;

    return new Response(readFileSync(path.join(post.folder, image)), { headers: { 'content-type': 'image/webp' } });
}
