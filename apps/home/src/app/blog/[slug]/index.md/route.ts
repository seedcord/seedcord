import { postFromParams, postParams } from '#lib/blog/posts';

import type { PostParams } from '#lib/blog/posts';

export const dynamic = 'force-static';
export const dynamicParams = false;
export const generateStaticParams = postParams;

export async function GET(_request: Request, route: PostParams): Promise<Response> {
    const markdown = await (await postFromParams(route)).markdown();
    return new Response(markdown, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
}
