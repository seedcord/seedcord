import { defaultHandlers } from 'mdast-util-to-markdown';

import { isSitePath } from '@seedcord/ui/sites';

import { canonicalUrl } from '#lib/site';

import type { LLMsOptions } from 'fumadocs-core/mdx-plugins/remark-llms';

const absolute = (url: string): string => (isSitePath(url) ? canonicalUrl(url) : url);

export const TWIN_OPTIONS: LLMsOptions = {
    headingIds: false,
    // removes {…} blocks, like the prettier-ignore comments around a table
    filterElement: (node) => node.type !== 'mdxFlowExpression',
    handlers: {
        link: (node, parent, state, info) =>
            defaultHandlers.link({ ...node, url: absolute(node.url) }, parent, state, info),
        image: (node, parent, state, info) =>
            defaultHandlers.image({ ...node, url: absolute(node.url) }, parent, state, info)
    }
};
