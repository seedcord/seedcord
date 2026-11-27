import viteReactWithPreamble from '@vitejs/plugin-react';
import { defineConfig } from 'seedcord';

export default defineConfig({
    root: './src',
    instance: './bot.ts',
    files: ['./locales'],
    build: { start: './index.ts' },
    vitePlugins: () => [viteReactWithPreamble()]
});
