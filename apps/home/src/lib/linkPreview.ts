import { PRODUCTION_SITES } from '@seedcord/brand';
import { PREVIEW_EMOJI, SITE_ACCENT } from '@seedcord/ui/LinkPreview';
import { readTimeLabel } from '@seedcord/ui/readingTime';

import { BLOG_DESCRIPTION, BLOG_NAME } from '#lib/blog/about';
import { joinList } from '#lib/blog/summary';
import { BLOG_PATH, twinPath } from '#lib/blog/paths';
import { canonicalUrl, CDN_URL, GUIDE_URL, REPO_URL, SITE_NAME, SITE_URL } from '#lib/site';

import type { PostSummary } from '#lib/blog/summary';
import type { PreviewCardProps, PreviewLink } from '@seedcord/ui/LinkPreview';

const THUMBNAIL = { url: `${CDN_URL}/assets/logo.png`, description: 'the seedcord mark' };

const SITE_LINKS: readonly PreviewLink[] = [
    { emoji: PREVIEW_EMOJI.home, label: 'Home', url: SITE_URL },
    { emoji: PREVIEW_EMOJI.guide, label: 'Guide', url: GUIDE_URL },
    { emoji: PREVIEW_EMOJI.docs, label: 'Docs', url: PRODUCTION_SITES.docs.url },
    { emoji: PREVIEW_EMOJI.github, label: 'GitHub', url: REPO_URL }
];

export const HOME_PREVIEW: PreviewCardProps = {
    accent: SITE_ACCENT.home,
    title: SITE_NAME,
    titleEmoji: PREVIEW_EMOJI.seedcord,
    body: 'A TypeScript framework for Discord bots, typed end to end.',
    extraText: [
        '- Typed slash options and customIds',
        '- Reusable checks and middleware',
        '- Any Vite plugin, hot reload and a dev tunnel',
        '- Gateway or HTTP, on a server, Workers or npm'
    ].join('\n'),
    thumbnail: THUMBNAIL,
    bannerUrl: `${CDN_URL}/assets/banner-2.webp`,
    links: SITE_LINKS
};

const BLOG_LINK: PreviewLink = { emoji: PREVIEW_EMOJI.home, label: 'Blog', url: canonicalUrl(BLOG_PATH) };
const BLOG_CRUMB = { accent: SITE_ACCENT.home, breadcrumb: ['blog'], breadcrumbEmoji: PREVIEW_EMOJI.home } as const;

export const BLOG_PREVIEW: PreviewCardProps = {
    ...BLOG_CRUMB,
    title: BLOG_NAME,
    body: BLOG_DESCRIPTION,
    thumbnail: THUMBNAIL,
    links: SITE_LINKS
};

const bylineOf = (post: PostSummary): string => `**${joinList(post.authors.map((author) => author.name))}**`;

const MS_PER_SECOND = 1000;

// discord shows the date in each reader's timezone. noon UTC falls on the same day from UTC-12 to UTC+11
const discordDate = (date: string): string => `<t:${Date.parse(`${date}T12:00:00Z`) / MS_PER_SECOND}:D>`;

export function postPreview(post: PostSummary): PreviewCardProps {
    return {
        ...BLOG_CRUMB,
        title: post.title,
        body: post.description,
        subtext: [bylineOf(post), discordDate(post.created), readTimeLabel(post.minutes)],
        ...(post.cover && { bannerUrl: canonicalUrl(post.cover.src) }),
        links: [
            BLOG_LINK,
            ...(post.unlisted
                ? []
                : [{ emoji: PREVIEW_EMOJI.markdown, label: 'Markdown', url: canonicalUrl(twinPath(post.slug)) }]),
            { emoji: PREVIEW_EMOJI.github, label: 'Edit on GitHub', url: post.editUrl }
        ]
    };
}
