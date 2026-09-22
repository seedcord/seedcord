import { checkLength, checkType, checkUrl, describeValue, isFilled, messageOf } from './checks';
import { collectInto, throwFirst } from './collector';
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
import { checkEmbedLimits } from './limits';
import { scriptSafeJson } from './scriptSafeJson';
import { childrenOf, isElement, nameOf, place, rejectVueVNode } from './tree';
import { LINK_STYLE, SPACING, TYPE } from './wire';

import type { Collector } from './collector';
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
import type { EmbedElement, EmbedNode } from './element';
import type { Path, Placed } from './tree';
import type {
    APIActionRowComponent,
    APIButtonComponentWithURL,
    APIComponentInContainer,
    APIContainerComponent,
    APIMediaGalleryComponent,
    APIMediaGalleryItem,
    APIMessageComponentEmoji,
    APISectionComponent,
    APISeparatorComponent,
    APITextDisplayComponent,
    APIThumbnailComponent
} from 'discord-api-types/v10';

const PLACEMENT_HINT = new Map<unknown, string>([
    [Thumbnail, 'Use it as a <Section> accessory'],
    [LinkButton, 'Put it in an <ActionRow> or use it as a <Section> accessory'],
    [MediaGalleryItem, 'Put it in a <MediaGallery>']
]);

// assumption: component embeds share discord's limits for message components
const MAX_SECTION_TEXTS = 3;
const MAX_ROW_BUTTONS = 5;
const MAX_ITEMS_PER_GALLERY = 10;
const MAX_LABEL_LENGTH = 80;
const MAX_BUTTON_URL_LENGTH = 512;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_ACCENT_COLOR = 0xff_ff_ff;
// from the component embed docs
const MAX_MEDIA_URL_LENGTH = 2048;

/** The JSON document Discord reads from a page to build a component embed. */
export interface ComponentEmbedPayload {
    component: APIContainerComponent;
}

/**
 * Converts a {@link Container} tree into the JSON document Discord reads for a component embed. To write the JSON
 * into a page, use {@link toComponentEmbedJson} or {@link toComponentEmbedScript}. Both escape it for a `<script>` tag.
 *
 * @throws a {@link ComponentEmbedError} when the tree breaks a rule of the format, or when your own code throws while
 * the package reads it. Check `error.code` to see which.
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
export function toComponentEmbed(root: EmbedElement): ComponentEmbedPayload {
    return buildEmbed(root, scriptSafeJson).payload;
}

type ToJson = (payload: ComponentEmbedPayload) => string;

// the size check measures the json that toJson returns
export function buildEmbed(root: EmbedElement, toJson: ToJson): { payload: ComponentEmbedPayload; json: string } {
    try {
        const payload = buildPayload(root, throwFirst);
        const json = toJson(payload);
        checkEmbedLimits(payload.component, json, throwFirst);
        return { payload, json };
    } catch (error) {
        throw asEmbedError(error);
    }
}

// sentJson is the text discord will read, when it isn't the package's own output
export function collectErrors(root: EmbedElement, sentJson?: string): ComponentEmbedError[] {
    const errors: ComponentEmbedError[] = [];
    const collector = collectInto(errors);
    try {
        const payload = buildPayload(root, collector);
        if (errors.length === 0) checkEmbedLimits(payload.component, sentJson ?? scriptSafeJson(payload), collector);
    } catch (error) {
        errors.push(asEmbedError(error));
    }
    return errors;
}

function asEmbedError(error: unknown): ComponentEmbedError {
    if (error instanceof ComponentEmbedError) return error;
    return new ComponentEmbedError('ReadFailed', `Reading the component tree threw: ${messageOf(error)}.`, {
        cause: error
    });
}

// every props cast in this file comes after a check of element.type, here or in childrenOf
function buildPayload(root: EmbedElement, collector: Collector): ComponentEmbedPayload {
    const [container, ...rest] = place(root, []);
    if (rest.length > 0) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            `The root has ${String(rest.length + 1)} elements. Put all of the components in one <Container> and pass only that.`
        );
    }
    if (container?.element.type !== Container) {
        const found = container ? `<${nameOf(container.element.type)}>` : 'nothing';
        throw new ComponentEmbedError('InvalidStructure', `The root has to be a <Container>, got ${found}.`, {
            path: container?.path ?? []
        });
    }

    return { component: toContainer(container.element.props as ContainerProps, container.path, collector) };
}

function toContainer(
    { accentColor, spoiler, children }: ContainerProps,
    path: Path,
    collector: Collector
): APIContainerComponent {
    if (
        accentColor !== undefined &&
        !(Number.isSafeInteger(accentColor) && accentColor >= 0 && accentColor <= MAX_ACCENT_COLOR)
    ) {
        throw new ComponentEmbedError(
            'InvalidProp',
            `accentColor must be a whole number from 0 to 0xFFFFFF (like 0x5865f2), got ${describeValue(accentColor)}.`,
            { path }
        );
    }
    checkType('The <Container> spoiler', spoiler, 'boolean', path);

    const placed = place(children, path);
    if (placed.length === 0) {
        throw new ComponentEmbedError('InvalidStructure', '<Container> needs at least one component.', { path });
    }

    return {
        type: TYPE.Container,
        ...(accentColor !== undefined && { accent_color: accentColor }),
        ...(spoiler !== undefined && { spoiler }),
        components: collector.map(placed, (child) => toContainerChild(child, collector))
    };
}

function toContainerChild({ element, path }: Placed, collector: Collector): APIComponentInContainer {
    switch (element.type) {
        case TextDisplay: {
            return toTextDisplay(element.props as TextDisplayProps, path);
        }
        case Section: {
            return toSection(element.props as SectionProps, path, collector);
        }
        case MediaGallery: {
            return toMediaGallery(element.props as MediaGalleryProps, path, collector);
        }
        case Separator: {
            return toSeparator(element.props as SeparatorProps, path);
        }
        case ActionRow: {
            return toActionRow(element.props as ActionRowProps, path, collector);
        }
        default: {
            const name = nameOf(element.type);
            const hint = PLACEMENT_HINT.get(element.type);
            throw new ComponentEmbedError(
                'InvalidStructure',
                hint
                    ? `<${name}> can't go straight inside a <Container>. ${hint}.`
                    : `<${name}> can't go inside a <Container>. Use a <TextDisplay>, <Section>, <MediaGallery>, <Separator>, or <ActionRow>.`,
                { path }
            );
        }
    }
}

function toTextDisplay({ children }: TextDisplayProps, path: Path): APITextDisplayComponent {
    const parts = ([children] as unknown[])
        .flat(Infinity)
        .filter((part) => part !== null && part !== undefined && typeof part !== 'boolean');

    const element = parts.find((part) => isElement(part));
    if (element) {
        rejectVueVNode(element, path);
        throw new ComponentEmbedError(
            'InvalidStructure',
            `<TextDisplay> only takes text. Write Discord markdown like **bold** in place of <${nameOf(element.type)}>.`,
            { path }
        );
    }

    const stray = parts.find((part) => typeof part !== 'string' && typeof part !== 'number');
    if (stray !== undefined) {
        throw new ComponentEmbedError(
            'InvalidProp',
            `<TextDisplay> only takes strings and numbers, got ${describeValue(stray)}.`,
            { path }
        );
    }

    const content = parts.join('');
    if (content === '') {
        throw new ComponentEmbedError('InvalidStructure', 'A <TextDisplay> is empty. Give it some text or remove it.', {
            path
        });
    }

    return { type: TYPE.TextDisplay, content };
}

function toSection({ accessory, children }: SectionProps, path: Path, collector: Collector): APISectionComponent {
    return {
        type: TYPE.Section,
        components: collector.map(childrenOf(Section, path, children, TextDisplay, MAX_SECTION_TEXTS), (text) =>
            toTextDisplay(text.element.props as TextDisplayProps, text.path)
        ),
        accessory: toSectionAccessory(accessory, path)
    };
}

function toSectionAccessory(accessory: EmbedNode, sectionPath: Path): APISectionComponent['accessory'] {
    const [placed, ...rest] = place(accessory, sectionPath);
    if (!placed || rest.length > 0) {
        const found = placed ? String(rest.length + 1) : 'none';
        throw new ComponentEmbedError(
            'InvalidStructure',
            `A <Section> needs exactly one accessory, a <Thumbnail> or a <LinkButton>, got ${found}.`,
            { path: sectionPath }
        );
    }

    const { element, path } = placed;
    if (element.type === Thumbnail) return toThumbnail(element.props as MediaProps, path);
    if (element.type === LinkButton) return toLinkButton(element.props as LinkButtonProps, path);

    throw new ComponentEmbedError(
        'InvalidStructure',
        `A <Section> accessory must be a <Thumbnail> or a <LinkButton>, got <${nameOf(element.type)}>.`,
        { path }
    );
}

function toMedia({ url, description, spoiler }: MediaProps, path: Path): APIMediaGalleryItem {
    checkUrl('The media url', url, ['http:', 'https:'], MAX_MEDIA_URL_LENGTH, path);
    checkType('The media description', description, 'string', path);
    checkType('The media spoiler', spoiler, 'boolean', path);
    if (description !== undefined) checkLength('The media description', description, MAX_DESCRIPTION_LENGTH, path);

    return {
        media: { url },
        ...(description !== undefined && { description }),
        ...(spoiler !== undefined && { spoiler })
    };
}

function toThumbnail(props: MediaProps, path: Path): APIThumbnailComponent {
    return { type: TYPE.Thumbnail, ...toMedia(props, path) };
}

function toMediaGallery({ children }: MediaGalleryProps, path: Path, collector: Collector): APIMediaGalleryComponent {
    return {
        type: TYPE.MediaGallery,
        items: collector.map(
            childrenOf(MediaGallery, path, children, MediaGalleryItem, MAX_ITEMS_PER_GALLERY),
            (item) => toMedia(item.element.props as MediaProps, item.path)
        )
    };
}

function toSeparator({ divider, spacing }: SeparatorProps, path: Path): APISeparatorComponent {
    checkType('The <Separator> divider', divider, 'boolean', path);
    if (spacing !== undefined && !Object.hasOwn(SPACING, spacing)) {
        throw new ComponentEmbedError(
            'InvalidProp',
            `The <Separator> spacing must be 'small' or 'large', got ${describeValue(spacing)}.`,
            { path }
        );
    }

    return {
        type: TYPE.Separator,
        ...(divider !== undefined && { divider }),
        ...(spacing !== undefined && { spacing: SPACING[spacing] })
    };
}

function toActionRow(
    { children }: ActionRowProps,
    path: Path,
    collector: Collector
): APIActionRowComponent<APIButtonComponentWithURL> {
    return {
        type: TYPE.ActionRow,
        components: collector.map(childrenOf(ActionRow, path, children, LinkButton, MAX_ROW_BUTTONS), (button) =>
            toLinkButton(button.element.props as LinkButtonProps, button.path)
        )
    };
}

function toLinkButton({ url, label, emoji, disabled }: LinkButtonProps, path: Path): APIButtonComponentWithURL {
    // message buttons accept these three schemes. we assume embeds do too
    checkUrl('The <LinkButton> url', url, ['http:', 'https:', 'discord:'], MAX_BUTTON_URL_LENGTH, path);
    checkType('The <LinkButton> label', label, 'string', path);
    checkType('The <LinkButton> disabled', disabled, 'boolean', path);

    const shownEmoji = emojiToShow(emoji, path);
    if (!isFilled(label) && !shownEmoji) {
        throw new ComponentEmbedError(
            'InvalidProp',
            `<LinkButton> needs a label, an emoji, or both. Its url is ${url}.`,
            { path }
        );
    }

    if (isFilled(label)) checkLength('The <LinkButton> label', label, MAX_LABEL_LENGTH, path);

    return {
        type: TYPE.Button,
        style: LINK_STYLE,
        url,
        ...(isFilled(label) && { label }),
        ...(shownEmoji && { emoji: toEmoji(shownEmoji) }),
        ...(disabled !== undefined && { disabled })
    };
}

function emojiToShow(emoji: LinkButtonProps['emoji'], path: Path): APIMessageComponentEmoji | undefined {
    checkType('The <LinkButton> emoji id', emoji?.id, 'string', path);
    checkType('The <LinkButton> emoji name', emoji?.name, 'string', path);
    checkType('The <LinkButton> emoji animated', emoji?.animated, 'boolean', path);
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
