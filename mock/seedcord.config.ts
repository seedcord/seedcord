import { defineConfig } from '@seedcord/cli';

export default defineConfig({
    root: './src',
    instance: './bot.ts',
    entry: './index.ts',
    build: {
        tsconfig: './tsconfig.build.json'
    }
});
