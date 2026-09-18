import { Fragment, isValidElement } from 'react';

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

import type { ReactElement, ReactNode } from 'react';

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

export function expand(node: ReactNode): ReactElement[] {
    if (node === null || node === undefined || typeof node === 'boolean') return [];
    if (Array.isArray(node)) return node.flatMap(expand);
    if (isIterable(node)) return [...node].flatMap(expand);
    if (!isValidElement(node)) {
        throw new ComponentEmbedError(
            'InvalidStructure',
            `Text has to go inside a <TextDisplay>, got ${describeValue(node)}.`
        );
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

    return output as ReactNode;
}

// instanceof Promise is false for a promise made in an iframe or a vm context
function isThenable(value: unknown): value is PromiseLike<unknown> {
    return typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function';
}

export function childrenOf(parent: unknown, children: ReactNode, kind: unknown, max: number): ReactElement[] {
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
