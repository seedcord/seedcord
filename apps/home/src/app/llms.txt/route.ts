import { listedPosts } from '#lib/blog/posts';
import { llmsText } from '#lib/llms';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET(): Promise<Response> {
    const posts = await listedPosts();
    return new Response(llmsText(posts), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
