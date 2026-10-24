import { fileURLToPath } from 'node:url';

import type { Plugin } from 'vite';

export const ENV_BOOTSTRAP_ID = 'seedcord:env';
const RESOLVED_ENV_BOOTSTRAP_ID = `\0${ENV_BOOTSTRAP_ID}`;

type BootstrapOptions = { runtime: 'node'; directory?: string } | { runtime: 'worker' };

export function envBootstrapSource(options: BootstrapOptions): string {
    const helperPath = fileURLToPath(import.meta.resolve('@seedcord/core/internal/env'));
    const imports = `import { Envapter } from 'envapt';
import { bindViteEnv } from ${JSON.stringify(helperPath)};\n`;
    if (options.runtime === 'worker') {
        return `${imports}import { env } from 'cloudflare:workers';
export const binding = bindViteEnv(Envapter, import.meta.env, { bindings: env });\n`;
    }
    if (options.directory !== undefined) {
        return `${imports}export const binding = bindViteEnv(Envapter, import.meta.env, { directory: ${JSON.stringify(options.directory)} });\n`;
    }
    const utilsPath = fileURLToPath(import.meta.resolve('@seedcord/utils/internal'));
    return `${imports}import { botConfigDir } from ${JSON.stringify(utilsPath)};
export const binding = bindViteEnv(Envapter, import.meta.env, { directory: botConfigDir() });\n`;
}

export function envBootstrap(options: BootstrapOptions): Plugin {
    return {
        name: 'seedcord:env',
        resolveId: (id) => (id === ENV_BOOTSTRAP_ID ? RESOLVED_ENV_BOOTSTRAP_ID : undefined),
        load: (id) => (id === RESOLVED_ENV_BOOTSTRAP_ID ? envBootstrapSource(options) : undefined)
    };
}
