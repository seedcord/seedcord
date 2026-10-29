import { defineConfig } from 'seedcord';

export default defineConfig({
    root: './src',
    instance: './bot.ts',
    make: {
        helpers: {
            upper: (text: string) => text.toUpperCase()
        }
    }
});
