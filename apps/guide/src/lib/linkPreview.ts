import { DOCS_URL, HOME_URL } from '@seedcord/ui';
import { PREVIEW_EMOJI, SITE_ACCENT } from '@seedcord/ui/LinkPreview';
import { readingMinutes, readTimeLabel } from '@seedcord/ui/readingTime';

import { editUrl } from '#lib/pageActions';
import { isFrontPage, markdownUrl, shownTitle, SITE_DESCRIPTION } from '#lib/site';

import type { OrderedPage } from '#lib/neighbours';
import type { GuidePage } from '#lib/pageActions';
import type { PreviewCardProps, PreviewLink } from '@seedcord/ui/LinkPreview';

const SITE_LINKS: readonly PreviewLink[] = [
    { emoji: PREVIEW_EMOJI.home, label: 'Home', url: HOME_URL },
    { emoji: PREVIEW_EMOJI.docs, label: 'Docs', url: DOCS_URL }
];

interface GuidePreviewSource {
    page: GuidePage & { data: { description?: string | undefined } };
    order: readonly OrderedPage[];
    twinMarkdown: string;
}

export function guidePreview({ page, order, twinMarkdown }: GuidePreviewSource): PreviewCardProps {
    const title = shownTitle(page.url, page.data.title);
    const here = order.find((entry) => entry.href === page.url);
    const tabPages = order.filter((entry) => entry.tab === here?.tab);

    const breadcrumb = ['guide'];
    if (here) breadcrumb.push(here.tab);
    if (here?.group !== undefined && here.group !== title) breadcrumb.push(here.group);

    const subtext = [readTimeLabel(readingMinutes(twinMarkdown))];
    if (here) subtext.unshift(`${tabPages.indexOf(here) + 1} of ${tabPages.length} in ${here.tab}`);

    const front = isFrontPage(page.url);

    return {
        accent: SITE_ACCENT.guide,
        breadcrumb,
        breadcrumbEmoji: PREVIEW_EMOJI.guide,
        title,
        body: page.data.description ?? SITE_DESCRIPTION,
        subtext,
        links: [
            ...(front ? SITE_LINKS : []),
            { emoji: PREVIEW_EMOJI.markdown, label: 'Markdown', url: markdownUrl(page.url) },
            { emoji: PREVIEW_EMOJI.github, label: front ? 'Edit' : 'Edit on GitHub', url: editUrl(page.path) }
        ]
    };
}
