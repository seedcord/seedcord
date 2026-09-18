import { isValidElement } from 'react';

import { checkLength, checkType, checkUrl, describeValue, isFilled, messageOf } from './checks';
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
import { childrenOf, expand, nameOf } from './tree';

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

// assumption: component embeds share discord's limits for message components
const MAX_SECTION_TEXTS = 3;
const MAX_ROW_BUTTONS = 5;
const MAX_GALLERY_ITEMS = 10;
const MAX_LABEL_LENGTH = 80;
const MAX_BUTTON_URL_LENGTH = 512;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_ACCENT_COLOR = 0xff_ff_ff;
// these two come from the component embed docs
const MAX_MEDIA_URL_LENGTH = 2048;
const MAX_COMPONENTS = 40;

/** The JSON document Discord reads from a page to build a component embed. */
export interface ComponentEmbedPayload {
    component: APIContainerComponent;
}

/**
 * Converts a `<Container>` tree into the JSON document Discord reads for a component embed.
 *
 * @throws {@link ComponentEmbedError} when the tree breaks a rule of the format, or when your own code throws while
 * the tree is read. Check `error.code` to see which.
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
    try {
        return buildPayload(root);
    } catch (error) {
        if (error instanceof ComponentEmbedError) throw error;
        throw new ComponentEmbedError('ReadFailed', `Reading the component tree threw: ${messageOf(error)}.`, {
            cause: error
        });
    }
}

function buildPayload(root: ReactElement): ComponentEmbedPayload {
    const [container, ...rest] = expand(root);
    if (rest.length > 0) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            `The root must be one <Container>, got ${String(rest.length + 1)} elements.`
        );
    }
    if (container?.type !== Container) {
        throw new ComponentEmbedError('InvalidStructure', 'The root element must be a <Container>.');
    }

    const component = toContainer(container.props as ContainerProps);

    const count = countComponents(component);
    if (count > MAX_COMPONENTS) {
        throw new ComponentEmbedError(
            'OverLimit',
            `A component embed holds at most ${String(MAX_COMPONENTS)} components, this one has ${String(count)}.`
        );
    }

    return { component };
}

type Counted = APIContainerComponent | APIComponentInContainer | APIComponentInMessageActionRow;

function countComponents(component: Counted): number {
    const nested =
        'components' in component ? component.components.reduce((sum, child) => sum + countComponents(child), 0) : 0;
    const accessory = 'accessory' in component ? 1 : 0;
    return 1 + nested + accessory;
}

// every props cast below comes after a check of element.type, here or in childrenOf
function toContainer({ accentColor, spoiler, children }: ContainerProps): APIContainerComponent {
    if (
        accentColor !== undefined &&
        !(Number.isSafeInteger(accentColor) && accentColor >= 0 && accentColor <= MAX_ACCENT_COLOR)
    ) {
        throw new ComponentEmbedError(
            'InvalidProp',
            `accentColor must be an integer from 0 to 0xFFFFFF, got ${describeValue(accentColor)}.`
        );
    }
    checkType('The <Container> spoiler', spoiler, 'boolean');

    const elements = expand(children);
    if (elements.length === 0) {
        throw new ComponentEmbedError('InvalidStructure', '<Container> needs at least one component.');
    }

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
            throw new ComponentEmbedError(
                'InvalidStructure',
                `<${nameOf(element.type)}> cannot go directly inside a <Container>.`
            );
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
            'InvalidStructure',
            `<TextDisplay> only takes text. Write Discord markdown like **bold** in place of <${nameOf(element.type)}>.`
        );
    }

    const stray = parts.find((part) => typeof part !== 'string' && typeof part !== 'number');
    if (stray !== undefined) {
        throw new ComponentEmbedError('InvalidProp', `<TextDisplay> only takes text, got ${describeValue(stray)}.`);
    }

    const content = parts.join('');
    if (content === '') throw new ComponentEmbedError('InvalidStructure', '<TextDisplay> needs some text.');

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
        throw new ComponentEmbedError(
            'InvalidStructure',
            'A <Section> takes exactly one accessory, a <Thumbnail> or a <LinkButton>.'
        );
    }

    if (element.type === Thumbnail) return toThumbnail(element.props as MediaProps);
    if (element.type === LinkButton) return toLinkButton(element.props as LinkButtonProps);

    throw new ComponentEmbedError(
        'InvalidStructure',
        `A <Section> accessory must be a <Thumbnail> or a <LinkButton>, got <${nameOf(element.type)}>.`
    );
}

function toMedia({ url, description, spoiler }: MediaProps): APIMediaGalleryItem {
    checkUrl('The media url', url, ['http:', 'https:'], MAX_MEDIA_URL_LENGTH);
    checkType('The media description', description, 'string');
    checkType('The media spoiler', spoiler, 'boolean');
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
    checkType('The <Separator> divider', divider, 'boolean');
    if (spacing !== undefined && !Object.hasOwn(SPACING, spacing)) {
        throw new ComponentEmbedError(
            'InvalidProp',
            `The <Separator> spacing must be 'small' or 'large', got ${describeValue(spacing)}.`
        );
    }

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
    // message buttons accept these three schemes. we assume embeds do too
    checkUrl('The <LinkButton> url', url, ['http:', 'https:', 'discord:'], MAX_BUTTON_URL_LENGTH);
    checkType('The <LinkButton> label', label, 'string');
    checkType('The <LinkButton> disabled', disabled, 'boolean');

    const shownEmoji = emojiToShow(emoji);
    if (!isFilled(label) && !shownEmoji) {
        throw new ComponentEmbedError(
            'InvalidProp',
            `<LinkButton> needs a label, an emoji, or both. Its url is ${url}.`
        );
    }

    if (isFilled(label)) checkLength('The <LinkButton> label', label, MAX_LABEL_LENGTH);

    return {
        type: TYPE.Button,
        style: LINK_STYLE,
        url,
        ...(isFilled(label) && { label }),
        ...(shownEmoji && { emoji: toEmoji(shownEmoji) }),
        ...(disabled !== undefined && { disabled })
    };
}

function emojiToShow(emoji: LinkButtonProps['emoji']): APIMessageComponentEmoji | undefined {
    checkType('The <LinkButton> emoji id', emoji?.id, 'string');
    checkType('The <LinkButton> emoji name', emoji?.name, 'string');
    checkType('The <LinkButton> emoji animated', emoji?.animated, 'boolean');
    return isFilled(emoji?.id) || isFilled(emoji?.name) ? emoji : undefined;
}

// an emoji object from discord's API also carries roles and user
function toEmoji({ id, name, animated }: APIMessageComponentEmoji): APIMessageComponentEmoji {
    return {
        ...(id !== undefined && { id }),
        ...(name !== undefined && { name }),
        ...(animated !== undefined && { animated })
    };
}
