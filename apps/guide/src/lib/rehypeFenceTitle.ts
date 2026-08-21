const TITLE = /(?:^|\s)title="([^"]*)"/;

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

// remark-rehype writes the fence meta to data.meta
export function rehypeFenceTitle() {
    return (tree: Element): void => {
        for (const code of codeElements(tree)) {
            const found = TITLE.exec(code.data?.meta ?? '');
            if (!found?.[1]) continue;

            code.properties = { ...code.properties, 'data-title': found[1] };
        }
    };
}
