import { rehypeFenceTitle } from '@seedcord/ui/fence';
import { remarkHeadingRange } from '@seedcord/ui/remarkHeadingRange';
import { defineConfig } from 'fumadocs-mdx/config';

import { remarkPostFiles } from './src/lib/blog/postFiles';

export default defineConfig({
    mdxOptions: {
        // CodeCard in mdxComponents.tsx highlights every fence
        rehypeCodeOptions: false,
        remarkStructureOptions: false,
        // remarkPostFiles sizes the images itself
        remarkImageOptions: false,
        remarkPlugins: [[remarkHeadingRange, { subject: 'A post' }], remarkPostFiles],
        rehypePlugins: [rehypeFenceTitle]
    }
});
