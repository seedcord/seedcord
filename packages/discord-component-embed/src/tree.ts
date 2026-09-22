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
    const known = NAMES.get(type);
    if (known !== undefined) return known;
    if (typeof type !== 'function' && (typeof type !== 'object' || type === null)) return 'Anonymous';
    if ('displayName' in type && typeof type.displayName === 'string') return type.displayName;
    if (typeof type === 'function') return type.name || 'Anonymous';
    // react's memo keeps the wrapped function on type and forwardRef keeps it on render
    if ('type' in type) return nameOf(type.type);
    if ('render' in type) return nameOf(type.render);
    return 'Anonymous';
}

export function isElement(value: unknown): value is EmbedElement {
    return typeof value === 'object' && value !== null && 'type' in value && 'props' in value;
}

export type Path = ComponentEmbedError['path'];

// the path ends with the element's own step
export interface Placed {
    element: EmbedElement;
    path: Path;
}

export function rejectVueVNode(element: EmbedElement, path: Path): void {
    // vue's own isVNode reads this flag
    if ('__v_isVNode' in element && element.__v_isVNode === true) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            "Got a Vue VNode. Build the tree with h() from discord-component-embed instead of Vue's h().",
            { path }
        );
    }
}

// fromPayload records the JSON path of each element it builds
export const jsonPaths = new WeakMap<EmbedElement, Path>();

export function place(node: EmbedNode, path: Path): Placed[] {
    return withSteps(siblingsIn(node, path)).flatMap(({ element, step }) => {
        const stepPath = jsonPaths.get(element) ?? [...path, step];
        if (typeof element.type === 'string' || NAMES.has(element.type)) return [{ element, path: stepPath }];
        return place(renderUserComponent(element, stepPath), stepPath);
    });
}

function withSteps(siblings: readonly EmbedElement[]): { element: EmbedElement; step: string }[] {
    const named = siblings.map((element) => ({ element, name: nameOf(element.type) }));
    const totals = new Map<string, number>();
    for (const { name } of named) totals.set(name, (totals.get(name) ?? 0) + 1);

    const seen = new Map<string, number>();
    return named.map(({ element, name }) => {
        const position = (seen.get(name) ?? 0) + 1;
        seen.set(name, position);
        return { element, step: (totals.get(name) ?? 0) > 1 ? `${name} ${String(position)}` : name };
    });
}

function siblingsIn(node: EmbedNode, path: Path): EmbedElement[] {
    if (node === null || node === undefined || typeof node === 'boolean') return [];
    if (Array.isArray(node)) return node.flatMap((child: EmbedNode) => siblingsIn(child, path));
    if (isIterable(node)) return iterate(node, path).flatMap((child) => siblingsIn(child, path));
    if (!isElement(node)) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            `Got ${describeValue(node)} where only components can go. Wrap text in a <TextDisplay> and put that in a <Container> or a <Section>.`,
            { path }
        );
    }
    rejectVueVNode(node, path);

    if (node.type === Fragment) return siblingsIn((node.props as { children?: EmbedNode }).children, path);
    return [node];
}

function iterate(children: Iterable<EmbedNode>, path: Path): EmbedNode[] {
    try {
        return [...children];
    } catch (error) {
        throw new ComponentEmbedError('ReadFailed', `Reading an iterable in the children threw: ${messageOf(error)}.`, {
            cause: error,
            path
        });
    }
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

function renderUserComponent({ type, props }: EmbedElement, path: Path): EmbedNode {
    // react's memo, lazy, forwardRef, and context types are objects
    if (typeof type !== 'function' || needsRenderer(type)) {
        throw new ComponentEmbedError(
            'UnsupportedComponent',
            'Only plain function components work inside a component embed.',
            { path }
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
                { cause: error, path }
            );
        }
        throw new ComponentEmbedError(
            'ReadFailed',
            `<${nameOf(component)}> threw while the package read it: ${messageOf(error)}. Components here run outside React's renderer, so hooks don't work in them.`,
            { cause: error, path }
        );
    }

    if (isThenable(output)) {
        throw new ComponentEmbedError(
            'UnsupportedComponent',
            `<${nameOf(component)}> is async. Load its data first and pass it in as props.`,
            { path }
        );
    }

    return output as EmbedNode;
}

// instanceof Promise is false for a promise made in an iframe or a vm context
function isThenable(value: unknown): value is PromiseLike<unknown> {
    return typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function';
}

export function childrenOf(parent: unknown, path: Path, children: EmbedNode, kind: unknown, max: number): Placed[] {
    const placed = place(children, path);

    const stray = placed.find(({ element }) => element.type !== kind);
    if (stray) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            `<${nameOf(parent)}> only takes <${nameOf(kind)}> children, got <${nameOf(stray.element.type)}>.`,
            { path: stray.path }
        );
    }

    if (placed.length === 0 || placed.length > max) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            `<${nameOf(parent)}> needs 1 to ${String(max)} <${nameOf(kind)}> children, got ${String(placed.length)}.`,
            { path }
        );
    }

    return placed;
}
