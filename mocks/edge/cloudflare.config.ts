import { bindings, defineConfig } from 'cf/config';

// cf workers types calls this without a mode
export default defineConfig(({ mode = 'production' }) => ({
    worker: {
        name: 'seedcord-mock-edge',
        compatibilityDate: '2026-08-04',
        env: {
            DB: bindings.d1(),
            DISCORD_BOT_TOKEN: bindings.secret(),
            UNKNOWN_EXCEPTION_WEBHOOK_URL: bindings.secret(),
            HANDLED_EXCEPTION_WEBHOOK_URL: bindings.secret(),
            ENV: bindings.text(mode) // a text binding beats any value in .dev.vars or .env
        }
    }
}));
