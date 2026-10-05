import { llmsIndex, pageLinks } from '#lib/agents';
import { source } from '#lib/source';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
    return new Response(llmsIndex(await pageLinks(source)), {
        headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
}
