import { loader } from 'fumadocs-core/source';
import { defineDocs } from 'fumadocs-mdx/macro';

import { postSchema } from './frontmatter';
import { TWIN_OPTIONS } from './twinOptions';

const posts = defineDocs({
    dir: 'content/blog',
    docs: {
        files: ['*/index.mdx'],
        schema: postSchema,
        postprocess: { includeProcessedMarkdown: TWIN_OPTIONS }
    }
});

export const blog = loader({ baseUrl: '/blog', source: posts.toFumadocsSource() });

export type BlogPost = (typeof blog)['$inferPage'];

// YYYY-MM-DD strings sort in date order
export function listedPostsNewestFirst(): BlogPost[] {
    return blog
        .getPages()
        .filter((page) => !page.data.unlisted)
        .toSorted((a, b) => b.data.created.localeCompare(a.data.created));
}
