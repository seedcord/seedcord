import { llms } from 'fumadocs-core/source/llms';

import { llmsIndex, twinLinks } from '#lib/agents';
import { source } from '#lib/source';

export const dynamic = 'force-static';

export function GET(): Response {
    const index = llms(source);
    // index() adds its own heading from meta.json
    const links = source.pageTree.children.map((node) => index.indexNode(node)).join('\n');

    return new Response(llmsIndex(twinLinks(links)), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
