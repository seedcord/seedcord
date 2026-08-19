import { defineConfig } from 'fumadocs-mdx/config';

// eslint-disable-next-line import/no-default-export -- fumadocs-mdx reads this file's default export
export default defineConfig({
    // we highlight in CodeBlock instead
    mdxOptions: { rehypeCodeOptions: false }
});
