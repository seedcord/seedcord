import { defineConfig } from 'fumadocs-mdx/config';

import { rehypeFenceTitle } from './src/lib/rehypeFenceTitle';
import { remarkHeadingRange } from './src/lib/remarkHeadingRange';

// eslint-disable-next-line import/no-default-export -- fumadocs-mdx reads this file's default export
export default defineConfig({
    mdxOptions: {
        // mdxComponents.tsx highlights every fence through CodeBlock
        rehypeCodeOptions: false,
        // the img in mdxComponents.tsx needs src to stay a string
        remarkImageOptions: { useImport: false },
        remarkPlugins: [remarkHeadingRange],
        rehypePlugins: [rehypeFenceTitle]
    }
});
