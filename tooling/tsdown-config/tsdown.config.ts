// eslint-disable-next-line import-x/no-useless-path-segments -- tsdown's config loader cannot resolve a directory import
import { createTsdownConfig } from './src/index.ts';

export default createTsdownConfig({
    entry: ['src/index.ts'],
    clean: true
});
