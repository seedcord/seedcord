import { rehypeFenceTitle } from '@seedcord/ui/fence';
import { remarkHeadingRange } from '@seedcord/ui/remarkHeadingRange';
import { defineConfig } from 'fumadocs-mdx/config';

import { cleanFence } from './src/lib/fence';
import { jsxAttribute } from './src/lib/jsxAttribute';
import { rehypeFenceMeta } from './src/lib/rehypeFenceMeta';
import { remarkNoMappedJsx } from './src/lib/remarkNoMappedJsx';
import { remarkPageLinks } from './src/lib/remarkPageLinks';
import { remarkRefLinks } from './src/lib/remarkRefLinks';

import type { Table } from 'mdast';

const STRUCTURE_TYPES = ['heading', 'paragraph', 'blockquote', 'table', 'mdxJsxFlowElement', 'code'];

export default defineConfig({
    mdxOptions: {
        // mdxComponents.tsx highlights every fence through CodeBlock
        rehypeCodeOptions: false,
        // the img in mdxComponents.tsx requires src to be a string
        remarkImageOptions: { useImport: false },
        // `code` isn't in fumadocs' default types
        remarkStructureOptions: {
            types: STRUCTURE_TYPES,
            // fumadocs only indexes jsx without children. indexing a Tab whole puts its label beside its content
            mdxTypes: (node) => node.name === 'Tab' || node.children.length === 0,
            stringify: {
                stringify: (node, _parent, state, info) => {
                    // a fence indexes as the reader sees it without twoslash markings
                    if (node.type === 'code') return cleanFence(node.value);
                    if (node.type === 'mdxJsxFlowElement' && node.name === 'Tab') {
                        return `${jsxAttribute(node, 'label') ?? ''}: ${state.containerFlow(node, info)}`;
                    }
                    return undefined;
                },
                handlers: {
                    inlineCode: (node) => node.value,
                    emphasis: (node, _, state, info) => state.containerPhrasing(node, info),
                    strong: (node, _, state, info) => state.containerPhrasing(node, info),
                    delete: (node, _, state, info) => state.containerPhrasing(node, info),
                    linkReference: (node, _, state, info) => state.containerPhrasing(node, info),
                    blockquote: (node, _, state, info) => state.containerFlow(node, info),
                    table: (node: Table, _, state, info) =>
                        node.children
                            .map((row) => row.children.map((cell) => state.containerPhrasing(cell, info)).join(' · '))
                            .join('; ')
                }
            }
        },
        remarkPlugins: [
            [remarkHeadingRange, { subject: 'The guide' }],
            remarkNoMappedJsx,
            remarkRefLinks,
            remarkPageLinks
        ],
        rehypePlugins: [rehypeFenceTitle, rehypeFenceMeta]
    }
});
