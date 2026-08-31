import { llmsFull } from '#lib/agents';
import { source } from '#lib/source';
import { twinDocument } from '#lib/twin';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
    const pages = source.getPages();
    const documents = await Promise.all(
        pages.map(async (page) =>
            twinDocument({
                title: page.data.title,
                description: page.data.description,
                body: await page.data.getText('processed')
            })
        )
    );

    return new Response(llmsFull(documents), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
