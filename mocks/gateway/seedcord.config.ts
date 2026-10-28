import { defineConfig } from 'seedcord';

export default defineConfig({
    root: './src',
    instance: './bot.ts',
    files: ['./locales'],
    build: { start: './index.ts' }
});
