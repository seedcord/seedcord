import { guideSections } from '@seedcord/docs-search';

import { source } from '#lib/source';
import { withTrailingSlash } from '#lib/trailingSlash';

import type { GuideSection } from '@seedcord/docs-search';

export function allGuideSections(): GuideSection[] {
    return source.getPages().flatMap((page) =>
        guideSections({
            url: withTrailingSlash(page.url),
            title: page.data.title,
            description: page.data.description,
            structuredData: page.data.structuredData
        })
    );
}
