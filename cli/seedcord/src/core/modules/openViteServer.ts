import { createServer, preview } from 'vite';

import type { InlineConfig, Plugin, PreviewServer, ViteDevServer } from 'vite';

// a throwing configureServer or configurePreviewServer hook leaves vite's watcher and workerd running
function closesOn(stack: AsyncDisposableStack): Plugin {
    const deferClose = (server: ViteDevServer | PreviewServer): void => {
        stack.defer(() => server.close());
    };
    return {
        name: 'seedcord:close-on-stack',
        configureServer: { order: 'pre', handler: deferClose },
        configurePreviewServer: { order: 'pre', handler: deferClose }
    };
}

export function openViteServer(stack: AsyncDisposableStack, config: InlineConfig): Promise<ViteDevServer> {
    return createServer({ ...config, plugins: [closesOn(stack), ...(config.plugins ?? [])] });
}

export function openVitePreview(stack: AsyncDisposableStack, config: InlineConfig): Promise<PreviewServer> {
    return preview({ ...config, plugins: [closesOn(stack), ...(config.plugins ?? [])] });
}
