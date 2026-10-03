import {
    Container,
    MediaGallery,
    MediaGalleryItem,
    Section,
    Separator,
    TextDisplay,
    Thumbnail
} from 'discord-component-embed';

import { BRAND } from './palette';

import type { ReactElement } from 'react';

export const PREVIEW_EMOJI = {
    seedcord: '<:seedcord:1538077321318236281>',
    home: '<:sc_home:1555953281119948880>',
    guide: '<:sc_guide:1555953282554400878>',
    docs: '<:sc_docs:1555953283443589143>',
    github: '<:sc_github:1555953244336029828>',
    markdown: '<:sc_markdown:1555953243568480256>',
    npm: '<:sc_npm:1555953242540736532>',
    class: '<:sc_class:1555953251088867361>',
    interface: '<:sc_interface:1555953250321170503>',
    type: '<:sc_type:1555953249054629929>',
    function: '<:sc_function:1555953247708254280>',
    enum: '<:sc_enum:1555953246697299968>',
    variable: '<:sc_variable:1555953245313044523>',
    caret: '<:sc_caret_lg:1555958640525975572>',
    dot: '<:sc_dot:1555958638395396148>'
} as const;

export const accentColor = (hex: string): number => Number.parseInt(hex.slice(1), 16);

export const SITE_ACCENT = {
    home: accentColor(BRAND.pith),
    guide: accentColor(BRAND.rind),
    docs: accentColor(BRAND.flesh)
} as const;

export interface PreviewLink {
    emoji: string;
    label: string;
    url: string;
}

export interface LatestVersion {
    label: string;
    url: string;
}

interface PreviewThumbnail {
    url: string;
    description: string;
}

export interface PreviewCardProps {
    accent: number;
    breadcrumb?: readonly string[];
    breadcrumbEmoji?: string;
    title: string;
    titleEmoji?: string;
    body: string;
    extraText?: string;
    subtext?: readonly string[];
    links: readonly PreviewLink[];
    latestVersion?: LatestVersion;
    thumbnail?: PreviewThumbnail;
    bannerUrl?: string;
}

const withEmoji = (emoji: string | undefined, text: string): string => (emoji ? `${emoji} ${text}` : text);

function linkRow(links: readonly PreviewLink[], latestVersion: LatestVersion | undefined): string {
    const row = links.map(({ emoji, label, url }) => `${emoji} [${label}](${url})`).join(PREVIEW_EMOJI.dot);
    return latestVersion ? `Latest [${latestVersion.label}](${latestVersion.url})  /  ${row}` : row;
}

export function PreviewCard(props: PreviewCardProps): ReactElement {
    const {
        accent,
        breadcrumb,
        breadcrumbEmoji,
        title,
        titleEmoji,
        body,
        extraText,
        subtext,
        links,
        latestVersion,
        thumbnail,
        bannerUrl
    } = props;

    const head = (
        <>
            <TextDisplay>{`## ${withEmoji(titleEmoji, title)}\n${body}`}</TextDisplay>
            {extraText ? <TextDisplay>{extraText}</TextDisplay> : null}
        </>
    );

    return (
        <Container accentColor={accent}>
            {breadcrumb ? (
                <TextDisplay>{`-# ${withEmoji(breadcrumbEmoji, breadcrumb.join(PREVIEW_EMOJI.caret))}`}</TextDisplay>
            ) : null}
            {thumbnail ? (
                <Section accessory={<Thumbnail url={thumbnail.url} description={thumbnail.description} />}>
                    {head}
                </Section>
            ) : (
                head
            )}
            {subtext ? <TextDisplay>{`-# ${subtext.join(PREVIEW_EMOJI.dot)}`}</TextDisplay> : null}
            {bannerUrl ? (
                <MediaGallery>
                    <MediaGalleryItem url={bannerUrl} />
                </MediaGallery>
            ) : null}
            <Separator divider spacing="small" />
            <TextDisplay>{linkRow(links, latestVersion)}</TextDisplay>
        </Container>
    );
}
