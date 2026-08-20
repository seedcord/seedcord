import { defineConfig } from 'fumadocs-mdx/config';

// eslint-disable-next-line import/no-default-export -- fumadocs-mdx reads this file's default export
export default defineConfig({
    // mdxComponents.tsx highlights every fence through CodeBlock
    mdxOptions: { rehypeCodeOptions: false }
});
