import { describeValue, joinList } from './checks';
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
import { createElement } from './element';
import { collectErrors } from './toComponentEmbed';
import { LINK_STYLE, SPACING, TYPE } from './wire';

import type { Collector } from './collector';
import type { EmbedElement } from './element';
import type { ComponentEmbedPayload } from './toComponentEmbed';
import type { Path } from './tree';

type JsonObject = Readonly<Record<string, unknown>>;
type Convert = (node: unknown, path: Path, walk: Walk) => EmbedElement;

interface Walk {
    ids: Set<number>;
    collector: Collector;
}

// discord keeps component ids in 32 bits. its crawler shows nothing for -1 or 2147483648
const MAX_ID = 2_147_483_647;

/**
 * Turns a component embed's JSON back into a tree. Use it to check JSON you wrote by hand or got from somewhere else.
 * Pass the result to {@link toComponentEmbed} or {@link toComponentEmbedJson}. They throw the same errors they
 * throw for a tree built with JSX.
 *
 * @throws a {@link ComponentEmbedError} when the JSON can't become a tree, like a component with a type no embed allows
 * or a separator spacing other than 1 or 2. Its `path` lists the JSON keys that lead to the problem.
 *
 * @example
 * ```ts
 * // parsed JSON goes straight in
 * const payload = JSON.parse(await readFile('embed.json', 'utf8'));
 * toComponentEmbed(fromPayload(payload));
 * ```
 *
 * @example
 * ```ts
 * // annotate an object you write in code to get autocomplete and type errors
 * const card: ComponentEmbedPayload = {
 *     component: { type: 17, components: [{ type: 10, content: '# Hello' }] }
 * };
 * toComponentEmbedScript(fromPayload(card));
 * ```
 */
export function fromPayload(payload: ComponentEmbedPayload): EmbedElement {
    return readPayload(payload, throwFirst);
}

// every error in the JSON, one per broken component. the tree checks run once the JSON itself passes
export function collectPayloadErrors(payload: unknown): ComponentEmbedError[] {
    const errors: ComponentEmbedError[] = [];
    try {
        const tree = readPayload(payload, collectInto(errors));
        if (errors.length === 0) errors.push(...collectErrors(tree));
    } catch (error) {
        if (!(error instanceof ComponentEmbedError)) throw error;
        errors.push(error);
    }
    return errors;
}

// JSON.parse and JS callers skip the type check
function readPayload(payload: unknown, collector: Collector): EmbedElement {
    if (!isObject(payload) || !isObject(payload.component)) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            `A component embed payload is an object like { "component": { "type": 17, ... } }, got ${describeValue(payload)}.`
        );
    }
    checkKeys(payload, 'A component embed payload', ['component'], []);
    return toElement(payload.component, ['component'], { ids: new Set(), collector });
}

function isObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toElement(node: unknown, path: Path, walk: Walk): EmbedElement {
    if (!isObject(node)) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            `A component has to be an object with a type, got ${describeValue(node)}.`,
            { path }
        );
    }
    if (node.type !== TYPE.Button) checkId(node.id, path, walk.ids);

    switch (node.type) {
        case TYPE.Container: {
            checkKeys(node, 'A container', ['type', 'id', 'accent_color', 'spoiler', 'components'], path);
            return createElement(Container, {
                accentColor: node.accent_color,
                spoiler: node.spoiler,
                children: list(node, 'components', path, walk, toElement)
            });
        }
        case TYPE.TextDisplay: {
            checkKeys(node, 'A text display', ['type', 'id', 'content'], path);
            return createElement(TextDisplay, { children: node.content });
        }
        case TYPE.Section: {
            checkKeys(node, 'A section', ['type', 'id', 'components', 'accessory'], path);
            return createElement(Section, {
                accessory:
                    node.accessory === undefined ? undefined : toElement(node.accessory, [...path, 'accessory'], walk),
                children: list(node, 'components', path, walk, toElement)
            });
        }
        case TYPE.Thumbnail: {
            checkKeys(node, 'A thumbnail', ['type', 'id', 'media', 'description', 'spoiler'], path);
            return createElement(Thumbnail, toMediaProps(node));
        }
        case TYPE.MediaGallery: {
            checkKeys(node, 'A media gallery', ['type', 'id', 'items'], path);
            return createElement(MediaGallery, { children: list(node, 'items', path, walk, toGalleryItem) });
        }
        case TYPE.Separator: {
            checkKeys(node, 'A separator', ['type', 'id', 'divider', 'spacing'], path);
            return createElement(Separator, { divider: node.divider, spacing: spacingName(node.spacing, path) });
        }
        case TYPE.ActionRow: {
            checkKeys(node, 'An action row', ['type', 'id', 'components'], path);
            return createElement(ActionRow, { children: list(node, 'components', path, walk, toElement) });
        }
        case TYPE.Button: {
            return toLinkButton(node, path);
        }
        default: {
            const allowed = Object.values(TYPE).toSorted((a, b) => a - b);
            throw new ComponentEmbedError(
                'InvalidStructure',
                `Type ${describeValue(node.type)} can't go in a component embed. It takes types ${joinList(allowed.map(String), 'and')}.`,
                { path }
            );
        }
    }
}

function toLinkButton(node: JsonObject, path: Path): EmbedElement {
    if (node.style !== LINK_STYLE) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            `A component embed only takes link buttons, which have style 5 and a url. This one has style ${describeValue(node.style)}.`,
            { path }
        );
    }
    // discord's docs list these six. any other key, id included, makes discord fall back to the Open Graph card
    checkKeys(node, 'A button', ['type', 'style', 'url', 'label', 'emoji', 'disabled'], path);
    return createElement(LinkButton, { url: node.url, label: node.label, emoji: node.emoji, disabled: node.disabled });
}

// discord ignores most unknown keys. throwing on them catches a typo that would drop a field without a word
function checkKeys(node: JsonObject, what: string, allowed: readonly string[], path: Path): void {
    const unknown = Object.keys(node).find((key) => !allowed.includes(key));
    if (unknown === undefined) return;
    throw new ComponentEmbedError(
        'InvalidProp',
        `${what} doesn't take ${describeValue(unknown)}. It takes ${joinList(allowed, 'and')}.`,
        { path }
    );
}

function spacingName(size: unknown, path: Path): string | undefined {
    if (size === undefined) return undefined;
    const sizes = Object.entries(SPACING);
    const match = sizes.find(([, value]) => value === size);
    if (match) return match[0];

    const allowed = joinList(
        sizes.map(([name, value]) => `${String(value)} (${name})`),
        'or'
    );
    throw new ComponentEmbedError(
        'InvalidProp',
        `A separator spacing has to be ${allowed}, got ${describeValue(size)}.`,
        { path }
    );
}

function toGalleryItem(node: unknown, path: Path): EmbedElement {
    if (!isObject(node)) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            `A gallery item has to be an object like { "media": { "url": "https://..." } }, got ${describeValue(node)}.`,
            { path }
        );
    }
    checkKeys(node, 'A gallery item', ['media', 'description', 'spoiler'], path);
    return createElement(MediaGalleryItem, toMediaProps(node));
}

// a missing or wrong-typed list becomes empty. the tree checks then say how many children the parent needs
function list(node: JsonObject, key: string, path: Path, walk: Walk, convert: Convert): EmbedElement[] {
    const children = node[key];
    if (!Array.isArray(children)) return [];
    return walk.collector.map([...children.entries()], ([index, child]) =>
        convert(child, [...path, key, String(index)], walk)
    );
}

// the tree drops the id after this. a link preview has no interactions to read it back
function checkId(id: unknown, path: Path, ids: Set<number>): void {
    if (id === undefined) return;
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 0 || id > MAX_ID) {
        throw new ComponentEmbedError(
            'InvalidProp',
            `An id has to be a whole number from 0 to ${String(MAX_ID)}, got ${describeValue(id)}.`,
            { path }
        );
    }
    if (ids.has(id)) {
        throw new ComponentEmbedError(
            'InvalidProp',
            `Another component already has the id ${String(id)}. No two components in an embed can share one.`,
            { path }
        );
    }
    ids.add(id);
}

function toMediaProps(node: JsonObject): Record<string, unknown> {
    return {
        url: isObject(node.media) ? node.media.url : undefined,
        description: node.description,
        spoiler: node.spoiler
    };
}
