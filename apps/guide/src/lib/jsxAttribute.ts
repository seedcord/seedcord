import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

export type JsxNode = MdxJsxFlowElement | MdxJsxTextElement;

export function jsxAttribute(node: JsxNode, name: string): string | undefined {
    for (const attr of node.attributes) {
        if (attr.type !== 'mdxJsxAttribute' || attr.name !== name) continue;
        if (typeof attr.value === 'string') return attr.value;
    }
    return undefined;
}
