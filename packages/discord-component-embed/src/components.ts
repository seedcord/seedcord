import type { EmbedElement, EmbedNode } from './element';
import type { APIMessageComponentEmoji } from 'discord-api-types/v10';

export interface ContainerProps {
    /** The color of the bar on the left edge, as an RGB integer like `0x5865f2`. */
    accentColor?: number;
    spoiler?: boolean;
    children?: EmbedNode;
}

export interface TextDisplayProps {
    /**
     * Discord markdown. Text split by JSX expressions is joined back together. JSX turns a line break in your source
     * into a space, so write `{'\n'}` where the markdown needs a new line.
     */
    children: TextChild;
}

/** Text a `<TextDisplay>` accepts. Booleans, `null`, and `undefined` render nothing. */
export type TextChild = string | number | boolean | null | undefined | readonly TextChild[];

export interface SectionProps {
    /** A `<Thumbnail>` or a `<LinkButton>`, shown to the right of the text. */
    accessory: EmbedElement;
    /** One to three `<TextDisplay>` elements. */
    children: EmbedNode;
}

/** Props for {@link Thumbnail} and {@link MediaGalleryItem}. */
export interface MediaProps {
    /**
     * An `http` or `https` URL that Discord fetches when it builds the preview. A thumbnail takes a PNG, GIF, JPEG,
     * WebP, or AVIF image. A gallery item also takes MP4, MOV, or WebM video.
     */
    url: string;
    /** Alt text. */
    description?: string;
    spoiler?: boolean;
}

export interface MediaGalleryProps {
    /** One to ten `<MediaGalleryItem>` elements. */
    children: EmbedNode;
}

export interface SeparatorProps {
    /** Whether Discord draws a line. Discord defaults to `true`. */
    divider?: boolean;
    /** Discord defaults to `'small'`. */
    spacing?: 'small' | 'large';
}

export interface ActionRowProps {
    /** One to five `<LinkButton>` elements. */
    children: EmbedNode;
}

interface LinkButtonBase {
    url: string;
    disabled?: boolean;
}

type LinkButtonEmoji = APIMessageComponentEmoji & ({ id: string } | { name: string });

/** A button needs a label, an emoji, or both. An emoji needs an `id` for a custom one or a `name` for a Unicode one. */
export type LinkButtonProps = LinkButtonBase &
    ({ label: string; emoji?: LinkButtonEmoji } | { label?: string; emoji: LinkButtonEmoji });

/**
 * The root of every component embed. `toComponentEmbed` reads it. Rendering it with React outputs nothing.
 *
 * @example
 * ```tsx
 * <Container accentColor={0xf8f6e8}>
 *     <TextDisplay># seedcord</TextDisplay>
 * </Container>
 * ```
 */
export function Container(_props: ContainerProps): null {
    return null;
}

/**
 * A block of Discord markdown.
 *
 * @example
 * ```tsx
 * <TextDisplay>
 *     # **[{page.title}]({page.url})**{'\n'}
 *     {page.description}
 *     {page.isNew && ' (new)'}
 * </TextDisplay>
 * ```
 *
 * @example
 * ```tsx
 * // JSX reads a bare < as a tag. pass a custom emoji as a string
 * // an animated one is <a:name:id>
 * <TextDisplay>Built with {'<:seedcord:1538077321318236281>'} seedcord</TextDisplay>
 * ```
 */
export function TextDisplay(_props: TextDisplayProps): null {
    return null;
}

/**
 * Text with a thumbnail or a link button beside it.
 *
 * @example
 * ```tsx
 * <Section accessory={<LinkButton url="https://guide.seedcord.org" label="Read" />}>
 *     <TextDisplay>## The seedcord guide</TextDisplay>
 *     <TextDisplay>Build a typed Discord bot from the first command up.</TextDisplay>
 * </Section>
 * ```
 */
export function Section(_props: SectionProps): null {
    return null;
}

/**
 * A small image, used as the accessory of a `<Section>`.
 *
 * @example
 * ```tsx
 * <Section accessory={<Thumbnail url="https://seedcord.org/icon" description="The Materwelon mark" />}>
 *     <TextDisplay>## seedcord{'\n'}The whole Discord bot, wired and typed</TextDisplay>
 * </Section>
 * ```
 */
export function Thumbnail(_props: MediaProps): null {
    return null;
}

/**
 * A grid of images and videos.
 *
 * @example
 * ```tsx
 * <MediaGallery>
 *     {page.screenshots.map((shot) => (
 *         <MediaGalleryItem key={shot.url} url={shot.url} description={shot.alt} />
 *     ))}
 * </MediaGallery>
 * ```
 */
export function MediaGallery(_props: MediaGalleryProps): null {
    return null;
}

/**
 * One image or video inside a `<MediaGallery>`.
 *
 * @example
 * ```tsx
 * // Discord blurs a spoiler until someone clicks it
 * <MediaGalleryItem url={page.ogImage} description={page.title} spoiler />
 * ```
 */
export function MediaGalleryItem(_props: MediaProps): null {
    return null;
}

/**
 * Vertical space between components, with an optional line.
 *
 * @example
 * ```tsx
 * <Separator spacing="large" divider={false} />
 * ```
 */
export function Separator(_props: SeparatorProps): null {
    return null;
}

/**
 * A row of link buttons.
 *
 * @example
 * ```tsx
 * <ActionRow>
 *     <LinkButton url="https://guide.seedcord.org" label="Guide" />
 *     <LinkButton url="https://docs.seedcord.org" label="Reference" />
 *     <LinkButton url="https://github.com/seedcord/seedcord" label="GitHub" />
 * </ActionRow>
 * ```
 */
export function ActionRow(_props: ActionRowProps): null {
    return null;
}

/**
 * A button that opens a URL. It is the only kind of button a component embed allows.
 *
 * @example
 * ```tsx
 * <LinkButton url="https://guide.seedcord.org" label="Guide" emoji={{ name: '📖' }} />
 * ```
 *
 * @example
 * ```tsx
 * // a custom emoji takes its id. add animated: true for a gif
 * <LinkButton url="https://seedcord.org" label="seedcord" emoji={{ name: 'seedcord', id: '1538077321318236281' }} />
 * ```
 */
export function LinkButton(_props: LinkButtonProps): null {
    return null;
}
