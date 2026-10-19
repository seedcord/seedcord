import { parseCodeBlockAttributes } from 'fumadocs-core/mdx-plugins/codeblock-utils';

export const FENCE_TITLE = 'data-title';

interface Element {
    type: string;
    tagName?: string;
    properties?: Record<string, unknown>;
    data?: { meta?: string };
    children?: Element[];
}

function codeElements(node: Element): Element[] {
    if (node.type === 'element' && node.tagName === 'code') return [node];

    return (node.children ?? []).flatMap(codeElements);
}

// mdx leaves the fence meta out of its output
export function rehypeFenceTitle() {
    return (tree: Element): void => {
        for (const code of codeElements(tree)) {
            const { title } = parseCodeBlockAttributes(code.data?.meta ?? '', ['title']).attributes;
            if (typeof title === 'string') code.properties = { ...code.properties, [FENCE_TITLE]: title };
        }
    };
}
