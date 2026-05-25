// eslint-disable-next-line import/no-useless-path-segments -- tsdown's config loader cannot resolve directory imports; explicit ./src/index.ts (with allowImportingTsExtensions) is required for the self-build of this package
import { createTsdownConfig } from './src/index.ts';

export default createTsdownConfig({
    entry: ['src/index.ts'],
    clean: true
});
