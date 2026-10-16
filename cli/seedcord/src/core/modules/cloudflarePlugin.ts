import type * as CloudflareVitePlugin from '@cloudflare/vite-plugin';

export type CloudflarePlugin = typeof CloudflareVitePlugin.cloudflare;
export type ImportCloudflare = () => Promise<typeof CloudflareVitePlugin>;

export const WORKER_ENVIRONMENT = 'worker';

let pluginLoads = 0;
let plugin: Promise<typeof CloudflareVitePlugin> | undefined;
let pluginHoldsExports = false;

// a plugin copy stores the worker's named exports in module state. workerd fails to start from
// them in the next dev session. need to remember to remove this when cloudflare/workers-sdk#16324 is fixed
export function reportWorkerExports(names: readonly string[]): void {
    if (names.length > 0) pluginHoldsExports = true;
}

// each copy holds about 15 MB and adds two exit listeners to process
export function importCloudflare(): Promise<typeof CloudflareVitePlugin> {
    if (plugin !== undefined && !pluginHoldsExports) return plugin;
    pluginLoads += 1;
    pluginHoldsExports = false;
    // resolve finds the optional peer through seedcord's own folder in node_modules
    const url = `${import.meta.resolve('@cloudflare/vite-plugin')}?load=${pluginLoads}`;
    // justified: the URL resolves to the module the type import reads
    const loading = import(url) as Promise<typeof CloudflareVitePlugin>;
    plugin = loading;
    loading.catch(() => {
        if (plugin === loading) plugin = undefined;
    });
    return loading;
}
