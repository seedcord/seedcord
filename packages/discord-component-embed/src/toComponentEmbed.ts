import { Fragment, isValidElement } from 'react';

import { ComponentEmbedError } from './ComponentEmbedError';
import {
    ActionRow,
    Container,
    LinkButton,
    MediaGallery,
    MediaGalleryItem,
    Section,
    Separator,
    TextDisplay,
    Thumbnail
} from './components';

import type {
    ActionRowProps,
    ContainerProps,
    LinkButtonProps,
    MediaGalleryProps,
    MediaProps,
    SectionProps,
    SeparatorProps,
    TextDisplayProps
} from './components';
import type {
    APIActionRowComponent,
    APIButtonComponentWithURL,
    APIComponentInContainer,
    APIComponentInMessageActionRow,
    APIContainerComponent,
    APIMediaGalleryComponent,
    APIMediaGalleryItem,
    APIMessageComponentEmoji,
    APISectionComponent,
    APISeparatorComponent,
    APITextDisplayComponent,
    APIThumbnailComponent,
    ButtonStyle,
    ComponentType,
    SeparatorSpacingSize
} from 'discord-api-types/v10';
import type { ReactElement, ReactNode } from 'react';

type UsedComponentType =
    'ActionRow' | 'Button' | 'Container' | 'MediaGallery' | 'Section' | 'Separator' | 'TextDisplay' | 'Thumbnail';

// discord's wire values
const TYPE: { readonly [Name in UsedComponentType]: (typeof ComponentType)[Name] } = {
    ActionRow: 1,
    Button: 2,
    Section: 9,
    TextDisplay: 10,
    Thumbnail: 11,
    MediaGallery: 12,
    Separator: 14,
    Container: 17
};
const LINK_STYLE: ButtonStyle.Link = 5;
const SPACING: Readonly<Record<'small' | 'large', SeparatorSpacingSize>> = { small: 1, large: 2 };

/** The JSON document Discord reads from a page to build a component embed. */
export interface ComponentEmbedPayload {
    component: APIContainerComponent;
}

/**
 * Converts a `<Container>` tree into the JSON document Discord reads for a component embed.
 *
 * @throws {@link ComponentEmbedError} when the tree breaks a rule of the format.
 *
 * @example
 * ```tsx
 * const payload = toComponentEmbed(
 *     <Container accentColor={0xf8f6e8}>
 *         <TextDisplay># seedcord</TextDisplay>
 *     </Container>
 * );
 * // payload.component.accent_color is 16316136
 * // payload.component.components is [{ type: 10, content: '# seedcord' }]
 * ```
 *
 * @example
 * ```tsx
 * // catch a broken preview in CI
 * for (const page of await getAllGuidePages()) {
 *     expect(() => toComponentEmbed(<GuidePreview page={page} />)).not.toThrow();
 * }
 * ```
 */
export function toComponentEmbed(root: ReactElement): ComponentEmbedPayload {
    const [container, ...rest] = expand(root);
    if (rest.length > 0) {
        throw new ComponentEmbedError(`The root must be one <Container>, got ${String(rest.length + 1)} elements.`);
    }
    if (container?.type !== Container) throw new ComponentEmbedError('The root element must be a <Container>.');

    const component = toContainer(container.props as ContainerProps);

    const count = countComponents(component);
    if (count > MAX_COMPONENTS) {
        throw new ComponentEmbedError(
            `A component embed holds at most ${String(MAX_COMPONENTS)} components, this one has ${String(count)}.`
        );
    }

    return { component };
}

const MAX_COMPONENTS = 40;

type Counted = APIContainerComponent | APIComponentInContainer | APIComponentInMessageActionRow;

function countComponents(component: Counted): number {
    const nested =
        'components' in component ? component.components.reduce((sum, child) => sum + countComponents(child), 0) : 0;
    const accessory = 'accessory' in component ? 1 : 0;
    return 1 + nested + accessory;
}

function expand(node: ReactNode): ReactElement[] {
    if (node === null || node === undefined || typeof node === 'boolean') return [];
    if (Array.isArray(node)) return node.flatMap(expand);
    if (!isValidElement(node)) {
        throw new ComponentEmbedError(`Text has to go inside a <TextDisplay>, got ${JSON.stringify(node)}.`);
    }

    if (node.type === Fragment) return expand((node.props as { children?: ReactNode }).children);
    if (typeof node.type === 'string' || NAMES.has(node.type)) return [node];
    return expand(renderUserComponent(node));
}

function renderUserComponent({ type, props }: ReactElement): ReactNode {
    // memo, lazy, forwardRef, and context types are objects. a class component has isReactComponent on its prototype
    if (
        typeof type !== 'function' ||
        (type.prototype as { isReactComponent?: unknown } | undefined)?.isReactComponent
    ) {
        throw new ComponentEmbedError('Only plain function components work inside a component embed.');
    }

    const component = type as (props: unknown) => unknown;
    let output: unknown;
    try {
        output = component(props);
    } catch (error) {
        throw new ComponentEmbedError(
            `<${nameOf(component)}> threw while the package read it. Components here run outside React's renderer, so hooks don't work.`,
            { cause: error }
        );
    }

    if (output instanceof Promise) {
        throw new ComponentEmbedError(`<${nameOf(component)}> is async. Load its data first and pass it in as props.`);
    }

    return output as ReactNode;
}

// a user's bundler can minify the .name of these functions
const NAMES = new Map<unknown, string>([
    [ActionRow, 'ActionRow'],
    [Container, 'Container'],
    [LinkButton, 'LinkButton'],
    [MediaGallery, 'MediaGallery'],
    [MediaGalleryItem, 'MediaGalleryItem'],
    [Section, 'Section'],
    [Separator, 'Separator'],
    [TextDisplay, 'TextDisplay'],
    [Thumbnail, 'Thumbnail']
]);

function nameOf(type: unknown): string {
    if (typeof type === 'string') return type;
    return NAMES.get(type) ?? (typeof type === 'function' ? type.name : 'unknown');
}

// assumption: component embeds share discord's limits for message components
const MAX_SECTION_TEXTS = 3;
const MAX_ROW_BUTTONS = 5;
const MAX_GALLERY_ITEMS = 10;
const MAX_LABEL_LENGTH = 80;
const MAX_BUTTON_URL_LENGTH = 512;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_ACCENT_COLOR = 0xff_ff_ff;
// this one comes from the component embed docs
const MAX_MEDIA_URL_LENGTH = 2048;

function childrenOf(parent: unknown, children: ReactNode, kind: unknown, max: number): ReactElement[] {
    const elements = expand(children);

    const stray = elements.find((element) => element.type !== kind);
    if (stray) {
        throw new ComponentEmbedError(
            `<${nameOf(parent)}> only takes <${nameOf(kind)}> children, got <${nameOf(stray.type)}>.`
        );
    }

    if (elements.length === 0 || elements.length > max) {
        throw new ComponentEmbedError(
            `<${nameOf(parent)}> takes 1 to ${String(max)} <${nameOf(kind)}> children, got ${String(elements.length)}.`
        );
    }

    return elements;
}

// every props cast below comes after a check of element.type, here or in childrenOf
function toContainer({ accentColor, spoiler, children }: ContainerProps): APIContainerComponent {
    if (
        accentColor !== undefined &&
        !(Number.isSafeInteger(accentColor) && accentColor >= 0 && accentColor <= MAX_ACCENT_COLOR)
    ) {
        throw new ComponentEmbedError(`accentColor must be an integer from 0 to 0xFFFFFF, got ${String(accentColor)}.`);
    }

    const elements = expand(children);
    if (elements.length === 0) throw new ComponentEmbedError('<Container> needs at least one component.');

    return {
        type: TYPE.Container,
        ...(accentColor !== undefined && { accent_color: accentColor }),
        ...(spoiler !== undefined && { spoiler }),
        components: elements.map(toContainerChild)
    };
}

function toContainerChild(element: ReactElement): APIComponentInContainer {
    switch (element.type) {
        case TextDisplay: {
            return toTextDisplay(element.props as TextDisplayProps);
        }
        case Section: {
            return toSection(element.props as SectionProps);
        }
        case MediaGallery: {
            return toMediaGallery(element.props as MediaGalleryProps);
        }
        case Separator: {
            return toSeparator(element.props as SeparatorProps);
        }
        case ActionRow: {
            return toActionRow(element.props as ActionRowProps);
        }
        default: {
            throw new ComponentEmbedError(`<${nameOf(element.type)}> cannot go directly inside a <Container>.`);
        }
    }
}

function toTextDisplay({ children }: TextDisplayProps): APITextDisplayComponent {
    const parts = ([children] as unknown[])
        .flat(Infinity)
        .filter((part) => part !== null && part !== undefined && typeof part !== 'boolean');

    const element = parts.find((part) => isValidElement(part));
    if (element) {
        throw new ComponentEmbedError(
            `<TextDisplay> only takes text. Write Discord markdown like **bold** in place of <${nameOf(element.type)}>.`
        );
    }

    const content = parts.join('');
    if (content === '') throw new ComponentEmbedError('<TextDisplay> needs some text.');

    return { type: TYPE.TextDisplay, content };
}

function toSection({ accessory, children }: SectionProps): APISectionComponent {
    return {
        type: TYPE.Section,
        components: childrenOf(Section, children, TextDisplay, MAX_SECTION_TEXTS).map((element) =>
            toTextDisplay(element.props as TextDisplayProps)
        ),
        accessory: toSectionAccessory(accessory)
    };
}

function toSectionAccessory(accessory: ReactNode): APISectionComponent['accessory'] {
    const [element, ...rest] = expand(accessory);
    if (!element || rest.length > 0) {
        throw new ComponentEmbedError('A <Section> takes exactly one accessory, a <Thumbnail> or a <LinkButton>.');
    }

    if (element.type === Thumbnail) return toThumbnail(element.props as MediaProps);
    if (element.type === LinkButton) return toLinkButton(element.props as LinkButtonProps);

    throw new ComponentEmbedError(
        `A <Section> accessory must be a <Thumbnail> or a <LinkButton>, got <${nameOf(element.type)}>.`
    );
}

function checkLength(what: string, value: string, max: number): void {
    if (value.length > max) {
        throw new ComponentEmbedError(`${what} is longer than ${String(max)} characters (${String(value.length)}).`);
    }
}

function hasScheme(url: string, schemes: readonly string[]): boolean {
    const protocol = URL.parse(url)?.protocol;
    return protocol !== undefined && schemes.includes(protocol);
}

// URL.parse ignores whitespace that the raw url still carries
function checkNoWhitespace(what: string, url: string): void {
    if (/\s/.test(url)) throw new ComponentEmbedError(`${what} has whitespace in it, got ${JSON.stringify(url)}.`);
}

function toMedia({ url, description, spoiler }: MediaProps): APIMediaGalleryItem {
    checkNoWhitespace('The media url', url);
    if (!hasScheme(url, ['http:', 'https:'])) {
        throw new ComponentEmbedError(`The media url must be an http or https URL, got ${url}.`);
    }
    checkLength('The media url', url, MAX_MEDIA_URL_LENGTH);
    if (description !== undefined) checkLength('The media description', description, MAX_DESCRIPTION_LENGTH);

    return {
        media: { url },
        ...(description !== undefined && { description }),
        ...(spoiler !== undefined && { spoiler })
    };
}

function toThumbnail(props: MediaProps): APIThumbnailComponent {
    return { type: TYPE.Thumbnail, ...toMedia(props) };
}

function toMediaGallery({ children }: MediaGalleryProps): APIMediaGalleryComponent {
    return {
        type: TYPE.MediaGallery,
        items: childrenOf(MediaGallery, children, MediaGalleryItem, MAX_GALLERY_ITEMS).map((element) =>
            toMedia(element.props as MediaProps)
        )
    };
}

function toSeparator({ divider, spacing }: SeparatorProps): APISeparatorComponent {
    return {
        type: TYPE.Separator,
        ...(divider !== undefined && { divider }),
        ...(spacing !== undefined && { spacing: SPACING[spacing] })
    };
}

function toActionRow({ children }: ActionRowProps): APIActionRowComponent<APIButtonComponentWithURL> {
    return {
        type: TYPE.ActionRow,
        components: childrenOf(ActionRow, children, LinkButton, MAX_ROW_BUTTONS).map((element) =>
            toLinkButton(element.props as LinkButtonProps)
        )
    };
}

function toLinkButton({ url, label, emoji, disabled }: LinkButtonProps): APIButtonComponentWithURL {
    const hasLabel = label !== undefined && label !== '';
    const hasEmoji = (emoji?.id !== undefined && emoji.id !== '') || (emoji?.name !== undefined && emoji.name !== '');
    if (!hasLabel && !hasEmoji) {
        throw new ComponentEmbedError(`<LinkButton> needs a label, an emoji, or both. Its url is ${url}.`);
    }

    checkNoWhitespace('The <LinkButton> url', url);
    // message buttons accept these three schemes. embeds are assumed to match
    if (!hasScheme(url, ['http:', 'https:', 'discord:'])) {
        throw new ComponentEmbedError(`The <LinkButton> url must be an http, https, or discord URL, got ${url}.`);
    }
    checkLength('The <LinkButton> url', url, MAX_BUTTON_URL_LENGTH);
    if (hasLabel) checkLength('The <LinkButton> label', label, MAX_LABEL_LENGTH);

    return {
        type: TYPE.Button,
        style: LINK_STYLE,
        url,
        ...(hasLabel && { label }),
        ...(emoji && hasEmoji && { emoji: toEmoji(emoji) }),
        ...(disabled !== undefined && { disabled })
    };
}

// an emoji object from discord's API also carries roles and user
function toEmoji({ id, name, animated }: APIMessageComponentEmoji): APIMessageComponentEmoji {
    return {
        ...(id !== undefined && { id }),
        ...(name !== undefined && { name }),
        ...(animated !== undefined && { animated })
    };
}
