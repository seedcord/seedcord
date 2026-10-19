import { loader } from 'fumadocs-core/source';
import { defineDocs } from 'fumadocs-mdx/macro';

import { postSchema } from './frontmatter';
import { BLOG_PATH } from './paths';
import { TWIN_OPTIONS } from './twinOptions';

const posts = defineDocs({
    dir: 'content/blog',
    docs: {
        files: ['*/index.mdx'],
        schema: postSchema,
        postprocess: { includeProcessedMarkdown: TWIN_OPTIONS }
    }
});

// page.url has no trailing slash. build post urls with postPath
export const blog = loader({ baseUrl: BLOG_PATH, source: posts.toFumadocsSource() });

export type BlogPost = (typeof blog)['$inferPage'];
