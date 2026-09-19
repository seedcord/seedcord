import { describeValue, isIterable, messageOf } from './checks';
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
import { Fragment } from './fragment';

import type { EmbedElement, EmbedNode } from './element';

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

export function nameOf(type: unknown): string {
    if (typeof type === 'string') return type;
    return NAMES.get(type) ?? (typeof type === 'function' ? type.name : 'unknown');
}

export function isElement(value: unknown): value is EmbedElement {
    return typeof value === 'object' && value !== null && 'type' in value && 'props' in value;
}

export function rejectVueVNode(element: EmbedElement): void {
    // vue's own isVNode reads this flag
    if ('__v_isVNode' in element && element.__v_isVNode === true) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            "Got a Vue VNode. Build the tree with h() from discord-component-embed instead of Vue's h()."
        );
    }
}

export function expand(node: EmbedNode): EmbedElement[] {
    if (node === null || node === undefined || typeof node === 'boolean') return [];
    if (Array.isArray(node)) return node.flatMap(expand);
    if (isIterable(node)) return [...node].flatMap(expand);
    if (!isElement(node)) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            `Text has to go inside a <TextDisplay>, got ${describeValue(node)}.`
        );
    }
    rejectVueVNode(node);

    if (node.type === Fragment) return expand((node.props as { children?: EmbedNode }).children);
    if (typeof node.type === 'string' || NAMES.has(node.type)) return [node];
    return expand(renderUserComponent(node));
}

function needsRenderer(type: object): boolean {
    // a preact context consumer has contextType. its provider is the context object
    if ('contextType' in type || 'Provider' in type) return true;

    const prototype: unknown = 'prototype' in type ? type.prototype : undefined;
    if (typeof prototype !== 'object' || prototype === null) return false;
    // react classes and preact/compat's memo and forwardRef set isReactComponent. a core preact class only has render
    return (
        ('isReactComponent' in prototype && Boolean(prototype.isReactComponent)) ||
        ('render' in prototype && typeof prototype.render === 'function')
    );
}

function renderUserComponent({ type, props }: EmbedElement): EmbedNode {
    // react's memo, lazy, forwardRef, and context types are objects
    if (typeof type !== 'function' || needsRenderer(type)) {
        throw new ComponentEmbedError(
            'UnsupportedComponent',
            'Only plain function components work inside a component embed.'
        );
    }

    const component = type as (props: unknown) => unknown;
    let output: unknown;
    try {
        output = component(props);
    } catch (error) {
        // lazy and other suspending components throw a promise
        if (isThenable(error)) {
            throw new ComponentEmbedError(
                'UnsupportedComponent',
                `<${nameOf(component)}> suspends while it loads. Load its data first and pass it in as props.`,
                { cause: error }
            );
        }
        throw new ComponentEmbedError(
            'ReadFailed',
            `<${nameOf(component)}> threw while the package read it: ${messageOf(error)}. Components here run outside React's renderer, so hooks don't work in them.`,
            { cause: error }
        );
    }

    if (isThenable(output)) {
        throw new ComponentEmbedError(
            'UnsupportedComponent',
            `<${nameOf(component)}> is async. Load its data first and pass it in as props.`
        );
    }

    return output as EmbedNode;
}

// instanceof Promise is false for a promise made in an iframe or a vm context
function isThenable(value: unknown): value is PromiseLike<unknown> {
    return typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function';
}

export function childrenOf(parent: unknown, children: EmbedNode, kind: unknown, max: number): EmbedElement[] {
    const elements = expand(children);

    const stray = elements.find((element) => element.type !== kind);
    if (stray) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            `<${nameOf(parent)}> only takes <${nameOf(kind)}> children, got <${nameOf(stray.type)}>.`
        );
    }

    if (elements.length === 0 || elements.length > max) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            `<${nameOf(parent)}> takes 1 to ${String(max)} <${nameOf(kind)}> children, got ${String(elements.length)}.`
        );
    }

    return elements;
}
