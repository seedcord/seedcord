import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import type * as CloudflareVitePlugin from '@cloudflare/vite-plugin';

export type CloudflarePlugin = typeof CloudflareVitePlugin.cloudflare;
export type ImportCloudflare = () => Promise<typeof CloudflareVitePlugin>;

export const WORKER_ENVIRONMENT = 'worker';

const CLOUDFLARE_PLUGIN = '@cloudflare/vite-plugin';

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

// the importer's path at the end of node's message can hold the name too
function isPackageMissing(error: unknown, name: string): boolean {
    const notFound = Error.isError(error) && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND';
    return notFound && error.message.startsWith(`Cannot find package '${name}'`);
}

// node resolves the cf/config import in cloudflare.config.ts from the bot's own node_modules
export function explainMissingCf(error: unknown, viteRoot: string): unknown {
    if (!isPackageMissing(error, 'cf')) return error;
    const why = `${paint.bold('cloudflare.config.ts')} imports ${paint.bold('cf/config')}.`;
    return new SeedcordError(SeedcordErrorCode.CliDependencyMissing, [['cf'], viteRoot, why], { cause: error });
}

// @cloudflare/config loads cloudflare.config.ts through node's module.registerHooks and throws on bun.
// delete this once bun ships registerHooks and cloudflare stops throwing on it
export function assertNotBun(): void {
    if ('Bun' in globalThis) throw new SeedcordError(SeedcordErrorCode.CliEdgeOnBun);
}

export async function loadCloudflare(viteRoot: string, importPlugin: ImportCloudflare): Promise<CloudflarePlugin> {
    try {
        const { cloudflare } = await importPlugin();
        return cloudflare;
    } catch (error: unknown) {
        if (isPackageMissing(error, CLOUDFLARE_PLUGIN)) {
            const why = `${paint.bold('seedcord dev')} and ${paint.bold('seedcord build')} run an edge bot through them.`;
            throw new SeedcordError(
                SeedcordErrorCode.CliDependencyMissing,
                [[CLOUDFLARE_PLUGIN, 'cf'], viteRoot, why],
                {
                    cause: error
                }
            );
        }
        throw new SeedcordError(SeedcordErrorCode.CoreImportFailed, [CLOUDFLARE_PLUGIN, asError(error).message], {
            cause: error
        });
    }
}
