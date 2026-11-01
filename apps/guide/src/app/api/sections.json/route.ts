import { guideSections } from '@seedcord/docs-search';

import { source } from '#lib/source';

export const dynamic = 'force-static';

export function GET(): Response {
    return Response.json(
        source.getPages().flatMap((page) =>
            guideSections({
                url: page.url,
                title: page.data.title,
                description: page.data.description,
                structuredData: page.data.structuredData
            })
        )
    );
}
