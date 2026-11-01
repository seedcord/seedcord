import { guideSections } from '@seedcord/docs-search';

import { TAB_OF_PAGE } from '#lib/nav';
import { source } from '#lib/source';
import { withTrailingSlash } from '#lib/trailingSlash';

import type { GuideSection } from '@seedcord/docs-search';

export function allGuideSections(): GuideSection[] {
    return source.getPages().flatMap((page) => {
        const tab = TAB_OF_PAGE.get(page.url);
        if (tab === undefined) {
            throw new Error(`${page.url} isn't in any tab of the guide. List it in the meta.json of a tab folder.`);
        }

        return guideSections({
            path: withTrailingSlash(page.url),
            tab,
            title: page.data.title,
            description: page.data.description,
            structuredData: page.data.structuredData
        });
    });
}
