import { defineConfig } from 'fumadocs-mdx/config';

import { rehypeFenceMeta } from './src/lib/rehypeFenceMeta';
import { remarkHeadingRange } from './src/lib/remarkHeadingRange';
import { remarkNoMappedJsx } from './src/lib/remarkNoMappedJsx';
import { remarkRefLinks } from './src/lib/remarkRefLinks';

export default defineConfig({
    mdxOptions: {
        // mdxComponents.tsx highlights every fence through CodeBlock
        rehypeCodeOptions: false,
        // the img in mdxComponents.tsx requires src to stay a string
        remarkImageOptions: { useImport: false },
        remarkPlugins: [remarkHeadingRange, remarkNoMappedJsx, remarkRefLinks],
        rehypePlugins: [rehypeFenceMeta]
    }
});
