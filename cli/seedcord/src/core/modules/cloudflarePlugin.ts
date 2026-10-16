import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import type * as CloudflareVitePlugin from '@cloudflare/vite-plugin';

export type CloudflarePlugin = typeof CloudflareVitePlugin.cloudflare;
export type ImportCloudflare = () => Promise<typeof CloudflareVitePlugin>;

export const WORKER_ENVIRONMENT = 'worker';

const CLOUDFLARE_PLUGIN = '@cloudflare/vite-plugin';

// import() finds the optional peer through seedcord's own folder in node_modules
export const importCloudflare: ImportCloudflare = () => import('@cloudflare/vite-plugin');

// the importer's path at the end of node's message can hold the name too
function isPackageMissing(error: unknown, name: string): boolean {
    const notFound = Error.isError(error) && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND';
    return notFound && error.message.startsWith(`Cannot find package '${name}'`);
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
            throw new SeedcordError(SeedcordErrorCode.CliDependencyMissing, [[CLOUDFLARE_PLUGIN, 'cf'], viteRoot, why], {
                cause: error
            });
        }
        throw new SeedcordError(SeedcordErrorCode.CoreImportFailed, [CLOUDFLARE_PLUGIN, asError(error).message], {
            cause: error
        });
    }
}
