import { createServer } from 'vite';

import type { InlineConfig, Plugin, ViteDevServer } from 'vite';

// if a configureServer hook throws, createServer rejects and the watcher and workerd it started keep running
function closesOn(stack: AsyncDisposableStack): Plugin {
    return {
        name: 'seedcord:close-on-stack',
        configureServer: {
            order: 'pre',
            handler: (server) => {
                stack.defer(() => server.close());
            }
        }
    };
}

export function createServerOn(stack: AsyncDisposableStack, config: InlineConfig): Promise<ViteDevServer> {
    return createServer({ ...config, plugins: [closesOn(stack), ...(config.plugins ?? [])] });
}
