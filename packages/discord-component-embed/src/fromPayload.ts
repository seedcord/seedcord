import { describeValue, joinList } from './checks';
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
import { LINK_STYLE, SPACING, TYPE } from './wire';

import type { EmbedElement } from './element';
import type { ComponentEmbedPayload } from './toComponentEmbed';
import type { Path } from './tree';

type JsonObject = Readonly<Record<string, unknown>>;
type Convert = (node: unknown, path: Path, ids: Set<number>) => EmbedElement;

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
    // JSON.parse and JS callers skip the type check
    const value: unknown = payload;
    if (!isObject(value) || !isObject(value.component)) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            `A component embed payload is an object like { "component": { "type": 17, ... } }, got ${describeValue(value)}.`
        );
    }
    return toElement(value.component, ['component'], new Set());
}

function isObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toElement(node: unknown, path: Path, ids: Set<number>): EmbedElement {
    if (!isObject(node)) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            `A component has to be an object with a type, got ${describeValue(node)}.`,
            { path }
        );
    }
    if (node.type !== TYPE.Button) checkId(node.id, path, ids);

    switch (node.type) {
        case TYPE.Container: {
            return createElement(Container, {
                accentColor: node.accent_color,
                spoiler: node.spoiler,
                children: list(node, 'components', path, ids, toElement)
            });
        }
        case TYPE.TextDisplay: {
            return createElement(TextDisplay, { children: node.content });
        }
        case TYPE.Section: {
            return createElement(Section, {
                accessory:
                    node.accessory === undefined ? undefined : toElement(node.accessory, [...path, 'accessory'], ids),
                children: list(node, 'components', path, ids, toElement)
            });
        }
        case TYPE.Thumbnail: {
            return createElement(Thumbnail, toMediaProps(node));
        }
        case TYPE.MediaGallery: {
            return createElement(MediaGallery, { children: list(node, 'items', path, ids, toGalleryItem) });
        }
        case TYPE.Separator: {
            return createElement(Separator, { divider: node.divider, spacing: spacingName(node.spacing, path) });
        }
        case TYPE.ActionRow: {
            return createElement(ActionRow, { children: list(node, 'components', path, ids, toElement) });
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
    return createElement(LinkButton, { url: node.url, label: node.label, emoji: node.emoji, disabled: node.disabled });
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
    return createElement(MediaGalleryItem, toMediaProps(node));
}

// a missing or wrong-typed list becomes empty. the tree checks then say how many children the parent needs
function list(node: JsonObject, key: string, path: Path, ids: Set<number>, convert: Convert): EmbedElement[] {
    const children = node[key];
    return Array.isArray(children)
        ? children.map((child, index) => convert(child, [...path, key, String(index)], ids))
        : [];
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
