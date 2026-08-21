import { defineConfig } from 'fumadocs-mdx/config';

import { rehypeFenceMeta } from './src/lib/rehypeFenceMeta';
import { remarkHeadingRange } from './src/lib/remarkHeadingRange';
import { remarkNoMappedJsx } from './src/lib/remarkNoMappedJsx';

// eslint-disable-next-line import/no-default-export -- fumadocs-mdx reads this file's default export
export default defineConfig({
    mdxOptions: {
        // mdxComponents.tsx highlights every fence through CodeBlock
        rehypeCodeOptions: false,
        // the img in mdxComponents.tsx needs src to stay a string
        remarkImageOptions: { useImport: false },
        remarkPlugins: [remarkHeadingRange, remarkNoMappedJsx],
        rehypePlugins: [rehypeFenceMeta]
    }
});
