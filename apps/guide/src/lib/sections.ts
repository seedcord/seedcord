import { guideSections } from '@seedcord/docs-search';

import { TAB_OF_PAGE } from '#lib/nav';
import { source } from '#lib/source';
import { withTrailingSlash } from '#lib/trailingSlash';

import type { GuideSection } from '@seedcord/docs-search';

export function allGuideSections(): GuideSection[] {
    return source.getPages().flatMap((page) => {
        const tab = TAB_OF_PAGE.get(page.url);
        if (tab === undefined) throw new Error(`${page.url} is in no tab of the guide's page tree`);

        return guideSections({
            url: withTrailingSlash(page.url),
            tab,
            title: page.data.title,
            description: page.data.description,
            structuredData: page.data.structuredData
        });
    });
}
