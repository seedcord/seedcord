import { absoluteUrl } from '@seedcord/ui/sites';
import { defaultHandlers } from 'mdast-util-to-markdown';

import { canonicalUrl } from '#lib/site';

import type { LLMsOptions } from 'fumadocs-core/mdx-plugins/remark-llms';

export const TWIN_OPTIONS: LLMsOptions = {
    headingIds: false,
    // removes {…} blocks, like the prettier-ignore comments around a table
    filterElement: (node) => node.type !== 'mdxFlowExpression',
    handlers: {
        link: (node, parent, state, info) =>
            defaultHandlers.link({ ...node, url: absoluteUrl(node.url, canonicalUrl) }, parent, state, info),
        image: (node, parent, state, info) =>
            defaultHandlers.image({ ...node, url: absoluteUrl(node.url, canonicalUrl) }, parent, state, info)
    }
};
