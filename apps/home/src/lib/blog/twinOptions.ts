import { defaultHandlers } from 'mdast-util-to-markdown';

import { canonicalUrl } from '#lib/site';

import type { LLMsOptions } from 'fumadocs-core/mdx-plugins/remark-llms';

const isSitePath = (url: string): boolean => url.startsWith('/') && !url.startsWith('//');
const absolute = (url: string): string => (isSitePath(url) ? canonicalUrl(url) : url);

export const TWIN_OPTIONS: LLMsOptions = {
    headingIds: false,
    handlers: {
        link: (node, parent, state, info) =>
            defaultHandlers.link({ ...node, url: absolute(node.url) }, parent, state, info),
        image: (node, parent, state, info) =>
            defaultHandlers.image({ ...node, url: absolute(node.url) }, parent, state, info)
    }
};
