import { PREVIEW_EMOJI, SITE_ACCENT } from '@seedcord/ui/LinkPreview';

import { CDN_URL, DOCS_URL, GUIDE_URL, REPO_URL, SITE_NAME, SITE_URL } from '#lib/site';

import type { PreviewCardProps } from '@seedcord/ui/LinkPreview';

export const HOME_PREVIEW: PreviewCardProps = {
    accent: SITE_ACCENT.home,
    title: SITE_NAME,
    titleEmoji: PREVIEW_EMOJI.seedcord,
    body: 'A TypeScript framework for Discord bots, typed end to end.',
    extraText: [
        '- Typed slash options and customIds',
        '- Reusable checks and middleware',
        '- Hot reload and a dev tunnel',
        '- Runs on the gateway or over HTTP'
    ].join('\n'),
    thumbnail: { url: `${CDN_URL}/assets/logo.png`, description: 'the seedcord mark' },
    bannerUrl: `${CDN_URL}/assets/banner-2.webp`,
    links: [
        { emoji: PREVIEW_EMOJI.home, label: 'Home', url: SITE_URL },
        { emoji: PREVIEW_EMOJI.guide, label: 'Guide', url: GUIDE_URL },
        { emoji: PREVIEW_EMOJI.docs, label: 'Docs', url: DOCS_URL },
        { emoji: PREVIEW_EMOJI.github, label: 'GitHub', url: REPO_URL }
    ]
};
