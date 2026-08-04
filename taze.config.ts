import { defineConfig } from 'taze';

export default defineConfig({
    recursive: true,
    exclude: ['discord.js>undici', '@discordjs/rest>undici']
});
