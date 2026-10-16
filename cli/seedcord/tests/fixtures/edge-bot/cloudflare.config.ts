import { bindings, defineConfig } from 'cf/config';

export default defineConfig({
    worker: {
        name: 'edge-bot',
        compatibilityDate: '2026-08-04',
        env: {
            DISCORD_BOT_TOKEN: bindings.secret(),
            DISCORD_PUBLIC_KEY: bindings.secret()
        }
    }
});
