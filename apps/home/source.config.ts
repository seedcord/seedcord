import { remarkHeadingRange } from '@seedcord/ui/remarkHeadingRange';
import { defineConfig } from 'fumadocs-mdx/config';

import { rehypeFenceTitle } from './src/lib/blog/fenceTitle';
import { remarkPostImages } from './src/lib/blog/postImages';

export default defineConfig({
    mdxOptions: {
        // CodeCard in mdxComponents.tsx highlights every fence
        rehypeCodeOptions: false,
        remarkStructureOptions: false,
        // remarkPostImages sizes the images itself
        remarkImageOptions: false,
        remarkPlugins: [[remarkHeadingRange, { site: 'A post' }], remarkPostImages],
        rehypePlugins: [rehypeFenceTitle]
    }
});
