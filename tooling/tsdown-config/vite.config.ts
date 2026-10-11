 
import { defineConfig } from 'vite-plus';

import { createTsdownConfig } from "./src";

export default defineConfig({
    pack: createTsdownConfig({
        entry: ['src/index.ts'],
        clean: true
    })
});
