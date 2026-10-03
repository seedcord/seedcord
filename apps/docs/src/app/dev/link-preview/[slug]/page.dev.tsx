import { PREVIEW_EMOJI, PreviewCard, SITE_ACCENT } from '@seedcord/ui/link-preview';
import { ComponentEmbed } from 'discord-component-embed/react';

import type { PreviewCardProps } from '@seedcord/ui/link-preview';
import type { ReactElement } from 'react';

const BASE: PreviewCardProps = {
    accent: SITE_ACCENT.docs,
    breadcrumb: ['docs', '@seedcord/core', 'v0.9.2'],
    breadcrumbEmoji: PREVIEW_EMOJI.docs,
    title: 'Cooldown',
    titleEmoji: PREVIEW_EMOJI.function,
    body: '',
    subtext: ['function', '2 parameters'],
    links: [{ emoji: PREVIEW_EMOJI.markdown, label: 'Markdown', url: 'https://seedcord.org/docs' }]
};

const CASES: Record<string, Partial<PreviewCardProps>> = {
    list: {
        body: 'Builds the reply in three steps.\n- reads the options\n- checks the gates\n  - nested item\n1. numbered one\n2. numbered two'
    },
    links: {
        body: 'Wraps the [discord.js client](https://discord.js.org/docs) and links to https://seedcord.org/guide bare. A masked [link with `code`](https://seedcord.org).'
    },
    code: {
        body: 'Returns a `ResolvedEmoji`. Call `toString()` for `<:name:id>`, or pass it to `setEmoji()`.'
    },
    'code-stripped': {
        body: 'Returns a ResolvedEmoji. Call toString() for <:name:id>, or pass it to setEmoji().'
    },
    emphasis: {
        body: 'A number duration is **seconds**. *italic*, _italic_, __underline__, ~~strike~~, ||spoiler||, and a lone * star.'
    },
    underscores: {
        title: 'MAX_JSON_BYTES',
        titleEmoji: PREVIEW_EMOJI.variable,
        body: 'The limit is MAX_JSON_BYTES. Private names like __internal__ and snake_case_name sit in prose.'
    },
    'angle-brackets': {
        title: 'Plugin<Opts>',
        body: 'Pass it as the Plugin<Opts> type argument. <@123> <#456> <t:0:R> <:name:id> a < b > c.'
    },
    'block-markdown': {
        body: '# a heading line\n> a quote line\n-# subtext line\n```ts\nconst a = 1;\n```'
    },
    'pipes-and-escapes': {
        body: 'Reads string | number | boolean. A backslash \\ and an escaped \\*star\\*.'
    }
};

export const generateStaticParams = (): { slug: string }[] => Object.keys(CASES).map((slug) => ({ slug }));

export default async function LinkPreviewCase({
    params
}: {
    params: Promise<{ slug: string }>;
}): Promise<ReactElement> {
    const { slug } = await params;
    return (
        <main>
            <ComponentEmbed>
                <PreviewCard {...BASE} {...CASES[slug]} />
            </ComponentEmbed>
            <p>{slug}</p>
        </main>
    );
}
