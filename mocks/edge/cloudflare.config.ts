import { bindings, defineConfig } from 'cf/config';

// local env files never replace a text binding's value, so ENV follows the vite mode.
// cf workers types calls this without a mode
export default defineConfig(({ mode = 'production' }) => ({
    worker: {
        name: 'seedcord-mock-edge',
        compatibilityDate: '2026-08-04',
        env: {
            PINGS: bindings.kv(),
            DISCORD_BOT_TOKEN: bindings.secret(),
            UNKNOWN_EXCEPTION_WEBHOOK_URL: bindings.secret(),
            HANDLED_EXCEPTION_WEBHOOK_URL: bindings.secret(),
            ENV: bindings.text(mode)
        }
    }
}));
