import { PREVIEW_EMOJI, SITE_ACCENT } from '@seedcord/ui/link-preview';
import { TWIN } from '@seedcord/ui/page-asset';

import { pageActionsFor } from '#lib/pageActions';
import { canonicalUrl, SITE_DESCRIPTION, SITE_NAME } from '#lib/site';

import type { GuidePage as SidebarPage } from '#lib/neighbours';
import type { GuidePage } from '#lib/pageActions';
import type { PreviewCardProps } from '@seedcord/ui/link-preview';

// both rates are guesses, nothing measured them. code reads faster because people skim it
const PROSE_WORDS_PER_MINUTE = 200;
const CODE_WORDS_PER_MINUTE = 400;

const FENCE = /```[\s\S]*?```/g;
const wordsIn = (text: string): number => text.match(/\S+/g)?.length ?? 0;

function readingMinutes(twinMarkdown: string): number {
    const code = twinMarkdown.match(FENCE)?.join(' ') ?? '';
    const prose = twinMarkdown.replace(FENCE, ' ');
    const minutes = wordsIn(prose) / PROSE_WORDS_PER_MINUTE + wordsIn(code) / CODE_WORDS_PER_MINUTE;
    return Math.max(1, Math.round(minutes));
}

interface GuidePreviewSource {
    page: GuidePage & { data: { description?: string | undefined } };
    order: readonly SidebarPage[];
    twinMarkdown: string;
}

export function guidePreview({ page, order, twinMarkdown }: GuidePreviewSource): PreviewCardProps {
    const isRoot = page.url === '/';
    const title = isRoot ? SITE_NAME : page.data.title;
    const here = order.find((entry) => entry.href === page.url);
    const tabPages = order.filter((entry) => entry.tab === here?.tab);

    const breadcrumb = ['guide'];
    if (here) breadcrumb.push(here.tab);
    if (here?.group !== undefined && here.group !== title) breadcrumb.push(here.group);

    const subtext = [`${readingMinutes(twinMarkdown)} min read`];
    if (here) subtext.unshift(`${tabPages.indexOf(here) + 1} of ${tabPages.length} in ${here.tab}`);

    return {
        accent: SITE_ACCENT.guide,
        breadcrumb,
        breadcrumbEmoji: PREVIEW_EMOJI.guide,
        title,
        body: page.data.description ?? SITE_DESCRIPTION,
        subtext,
        links: [
            { emoji: PREVIEW_EMOJI.markdown, label: 'Markdown', url: canonicalUrl(TWIN.publicPath(page.url)) },
            { emoji: PREVIEW_EMOJI.github, label: 'Edit on GitHub', url: pageActionsFor(page).links.edit }
        ]
    };
}
