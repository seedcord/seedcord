import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import type * as CloudflareVitePlugin from '@cloudflare/vite-plugin';

export type CloudflarePlugin = typeof CloudflareVitePlugin.cloudflare;
export type ImportCloudflare = () => Promise<typeof CloudflareVitePlugin>;

// the vite environment the plugin runs the worker in
export const WORKER_ENVIRONMENT = 'worker';

const CLOUDFLARE_PLUGIN = '@cloudflare/vite-plugin';

// import() finds the optional peer through seedcord's own folder in node_modules
export const importCloudflare: ImportCloudflare = () => import('@cloudflare/vite-plugin');

// node ends this message with the path of the file that did the import
// for a missing dependency of the plugin, that path has the plugin's name in it too
function isPluginMissing(error: unknown): boolean {
    const notFound = Error.isError(error) && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND';
    return notFound && error.message.startsWith(`Cannot find package '${CLOUDFLARE_PLUGIN}'`);
}

export async function loadCloudflare(viteRoot: string, importPlugin: ImportCloudflare): Promise<CloudflarePlugin> {
    try {
        const { cloudflare } = await importPlugin();
        return cloudflare;
    } catch (error: unknown) {
        if (isPluginMissing(error)) {
            throw new SeedcordError(SeedcordErrorCode.CliEdgeVitePluginMissing, [viteRoot], { cause: error });
        }
        throw new SeedcordError(SeedcordErrorCode.CliImportFailed, [CLOUDFLARE_PLUGIN, asError(error).message], {
            cause: error
        });
    }
}
