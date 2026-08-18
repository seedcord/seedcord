import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';
import { defineConfig } from 'fumadocs-mdx/config';
import { transformerTwoslash } from 'fumadocs-twoslash';

import { createSaltedTypesCache } from './src/lib/twoslash-cache';

// ten blocks over seedcord's generics run next dev out of an 8 GB heap
const twoslashEnabled = process.env.TWOSLASH !== '0';

// eslint-disable-next-line import/no-default-export -- fumadocs-mdx reads this file's default export
export default defineConfig({
    mdxOptions: {
        rehypeCodeOptions: {
            themes: { light: 'github-light', dark: 'github-dark' },
            transformers: [
                ...(rehypeCodeDefaultOptions.transformers ?? []),
                ...(twoslashEnabled ? [transformerTwoslash({ typesCache: createSaltedTypesCache() })] : [])
            ],
            // shiki cannot lazy-load a language inside a twoslash popup
            langs: ['js', 'jsx', 'ts', 'tsx']
        }
    }
});
