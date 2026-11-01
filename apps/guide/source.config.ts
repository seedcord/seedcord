import { rehypeFenceTitle } from '@seedcord/ui/fence';
import { remarkHeadingRange } from '@seedcord/ui/remarkHeadingRange';
import { defineConfig } from 'fumadocs-mdx/config';

import { cleanFence } from './src/lib/fence';
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
        // the img in mdxComponents.tsx requires src to stay a string
        remarkImageOptions: { useImport: false },
        // fumadocs leaves `code` out of its default types
        remarkStructureOptions: {
            types: STRUCTURE_TYPES,
            stringify: {
                // a fence indexes as the reader sees it without twoslash markings
                stringify: (node) => (node.type === 'code' ? cleanFence(node.value) : undefined),
                handlers: {
                    inlineCode: (node) => node.value,
                    emphasis: (node, _, state, info) => state.containerPhrasing(node, info),
                    strong: (node, _, state, info) => state.containerPhrasing(node, info),
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
