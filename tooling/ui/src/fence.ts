import { parseCodeBlockAttributes } from 'fumadocs-core/mdx-plugins/codeblock-utils';
import { isValidElement } from 'react';
import { visit } from 'unist-util-visit';

import { isHighlightable } from './shiki';

import type { HighlightLanguage } from './shiki';
import type { Element, Root } from 'hast';
// adds the fence meta to the hast element data type
import type {} from 'mdast-util-to-hast';
import type { ReactNode } from 'react';

const LANGUAGE_PREFIX = 'language-';
const TITLE_ATTR = 'data-title';

export function visitFences(tree: Root, onFence: (code: Element, meta: string) => void): void {
    visit(tree, 'element', (node, _index, parent) => {
        if (node.tagName === 'code' && parent?.type === 'element' && parent.tagName === 'pre') {
            onFence(node, node.data?.meta ?? '');
        }
    });
}

const languageIn = (names: readonly unknown[]): string | undefined =>
    names
        .find((name): name is string => typeof name === 'string' && name.startsWith(LANGUAGE_PREFIX))
        ?.slice(LANGUAGE_PREFIX.length);

export function languageOf(code: Element): string {
    const names = code.properties.className;
    return languageIn(Array.isArray(names) ? names : [names]) ?? '';
}

// mdx leaves the fence meta out of its output
export function rehypeFenceTitle() {
    return (tree: Root): void => {
        visitFences(tree, (code, meta) => {
            const { title } = parseCodeBlockAttributes(meta, ['title']).attributes;
            if (typeof title === 'string') code.properties = { ...code.properties, [TITLE_ATTR]: title };
        });
    };
}

interface FenceElement {
    code: string;
    tag: string | undefined;
    language: HighlightLanguage | undefined;
    title: string | undefined;
    props: Record<string, unknown>;
}

// mdx renders a fence as <pre><code className="language-x">
export function readFenceElement(children: ReactNode): FenceElement | null {
    if (!isValidElement<Record<string, unknown>>(children)) return null;

    const { props } = children;
    if (typeof props.children !== 'string') return null;

    const className = typeof props.className === 'string' ? props.className : '';
    const tag = languageIn(className.split(/\s+/));
    const title = props[TITLE_ATTR];

    return {
        code: props.children,
        tag,
        language: tag !== undefined && isHighlightable(tag) ? tag : undefined,
        title: typeof title === 'string' ? title : undefined,
        props
    };
}
