import { defineConfig } from 'seedcord';

export default defineConfig({
    root: './src',
    instance: './bot.ts',
    files: ['./locales'],
    make: {
        helpers: {
            upper: (text: string) => text.toUpperCase()
        }
    }
});
