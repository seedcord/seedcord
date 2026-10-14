import { dirname } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError, isPlainObject } from '@seedcord/utils/internal';

import type * as CloudflareVitePlugin from '@cloudflare/vite-plugin';
import type * as Wrangler from 'wrangler';

export type CloudflarePlugin = typeof CloudflareVitePlugin.cloudflare;
export type ImportCloudflare = () => Promise<typeof CloudflareVitePlugin>;
export type ImportWrangler = () => Promise<typeof Wrangler>;

// the vite environment the plugin runs the worker in
export const WORKER_ENVIRONMENT = 'worker';

const CLOUDFLARE_PLUGIN = '@cloudflare/vite-plugin';

// import() finds the optional peer through seedcord's own folder in node_modules
export const importCloudflare: ImportCloudflare = () => import('@cloudflare/vite-plugin');
export const importWrangler: ImportWrangler = () => import('wrangler');

// wrangler dev listens here when the config sets no dev.port
const WRANGLER_DEV_PORT = 8787;

// node ends this message with the path of the file that did the import
// for a missing dependency of the package, that path has the package's name in it too
function isPackageMissing(error: unknown, name: string): boolean {
    const notFound = Error.isError(error) && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND';
    return notFound && error.message.startsWith(`Cannot find package '${name}'`);
}

async function loadWrangler(wranglerConfig: string, importReader: ImportWrangler): Promise<typeof Wrangler> {
    try {
        return await importReader();
    } catch (error: unknown) {
        if (!isPackageMissing(error, 'wrangler')) throw error;
        throw new SeedcordError(SeedcordErrorCode.CliEdgeWranglerMissing, [dirname(wranglerConfig)], { cause: error });
    }
}

// wrangler's ParseError message is a bare code like ValueExpected, with the position in location
function parseFailure(error: unknown): string {
    const failure = asError(error);
    const location: unknown = Reflect.get(failure, 'location');
    if (!isPlainObject(location) || typeof location.line !== 'number') return failure.message;
    return `${failure.message} at line ${String(location.line)}, column ${String(location.column)}`;
}

// the plugin reads the config with the same function.
// @cloudflare/workers-utils holds wrangler's Config type and is not installed
export async function readDevPort(wranglerConfig: string, importReader: ImportWrangler): Promise<number> {
    const wrangler = await loadWrangler(wranglerConfig, importReader);
    let config: unknown;
    try {
        config = wrangler.unstable_readConfig({ config: wranglerConfig }, { hideWarnings: true });
    } catch (error: unknown) {
        throw new SeedcordError(SeedcordErrorCode.CliWranglerConfigUnreadable, [wranglerConfig, parseFailure(error)], {
            cause: error
        });
    }
    const dev = isPlainObject(config) ? config.dev : undefined;
    const port = isPlainObject(dev) ? dev.port : undefined;
    return typeof port === 'number' ? port : WRANGLER_DEV_PORT;
}

export async function loadCloudflare(viteRoot: string, importPlugin: ImportCloudflare): Promise<CloudflarePlugin> {
    try {
        const { cloudflare } = await importPlugin();
        return cloudflare;
    } catch (error: unknown) {
        if (isPackageMissing(error, CLOUDFLARE_PLUGIN)) {
            throw new SeedcordError(SeedcordErrorCode.CliEdgeVitePluginMissing, [viteRoot], { cause: error });
        }
        throw new SeedcordError(SeedcordErrorCode.CliImportFailed, [CLOUDFLARE_PLUGIN, asError(error).message], {
            cause: error
        });
    }
}
