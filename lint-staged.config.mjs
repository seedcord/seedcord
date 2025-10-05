/**
 * @type {import('lint-staged').Configuration}
 */
const config = {
  '*.{ts,tsx,js,jsx,cjs,mjs}': ['pnpm exec prettier --write'],
  '*.{json,md,mdx,yml,yaml}': ['pnpm exec prettier --write'],
  '*.{css,scss,less}': ['pnpm exec prettier --write'],
  '**/*': () => ['pnpm run lint', 'pnpm run tc']
};

export default config;
