import { createTsupConfig } from './src';

export default createTsupConfig({
    entry: ['src/index.ts'],
    clean: true
});
