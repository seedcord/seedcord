const TITLE = /(?:^|\s)title="([^"]*)"/;
const OUTPUT = /(?:^|\s)output(?:\s|$)/;

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
export function rehypeFenceMeta() {
    return (tree: Element): void => {
        for (const code of codeElements(tree)) {
            const meta = code.data?.meta ?? '';
            const title = TITLE.exec(meta)?.[1];
            const added: Record<string, unknown> = {};

            if (title) added['data-title'] = title;
            if (OUTPUT.test(meta)) added['data-output'] = '';

            code.properties = { ...code.properties, ...added };
        }
    };
}
