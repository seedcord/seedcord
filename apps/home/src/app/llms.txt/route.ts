import { listedPosts } from '#lib/blog/posts.ts';
import { llmsText } from '#lib/llms.ts';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET(): Promise<Response> {
    const posts = await listedPosts();
    return new Response(llmsText(posts), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
