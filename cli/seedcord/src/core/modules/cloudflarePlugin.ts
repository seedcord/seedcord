import { dirname } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError, isPlainObject } from '@seedcord/utils/internal';

import type * as CloudflareVitePlugin from '@cloudflare/vite-plugin';
import type * as Wrangler from 'wrangler';

export type CloudflarePlugin = typeof CloudflareVitePlugin.cloudflare;
export type ImportCloudflare = () => Promise<typeof CloudflareVitePlugin>;
type ImportWrangler = () => Promise<typeof Wrangler>;

export const WORKER_ENVIRONMENT = 'worker';

const CLOUDFLARE_PLUGIN = '@cloudflare/vite-plugin';

// import() finds the optional peer through seedcord's own folder in node_modules
export const importCloudflare: ImportCloudflare = () => import('@cloudflare/vite-plugin');
export const importWrangler: ImportWrangler = () => import('wrangler');

// 8787 is wrangler dev's port when the config doesn't have dev.port set
const WRANGLER_DEV_PORT = 8787;

// the importer's path at the end of node's message can hold the name too
function isPackageMissing(error: unknown, name: string): boolean {
    const notFound = Error.isError(error) && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND';
    return notFound && error.message.startsWith(`Cannot find package '${name}'`);
}

async function importOptionalPeer<TModule>(
    name: string,
    load: () => Promise<TModule>,
    whenMissing: (cause: unknown) => SeedcordError
): Promise<TModule> {
    try {
        return await load();
    } catch (error: unknown) {
        if (isPackageMissing(error, name)) throw whenMissing(error);
        throw new SeedcordError(SeedcordErrorCode.CliImportFailed, [name, asError(error).message], { cause: error });
    }
}

// a ParseError's message is a bare code like ValueExpected. the position is in location
function parseFailure(error: unknown): string {
    const failure = asError(error);
    const location: unknown = Reflect.get(failure, 'location');
    if (!isPlainObject(location) || typeof location.line !== 'number') return failure.message;
    return `${failure.message} at line ${String(location.line)}, column ${String(location.column)}`;
}

export async function readDevPort(wranglerConfig: string, importReader: ImportWrangler): Promise<number> {
    const wrangler = await importOptionalPeer(
        'wrangler',
        importReader,
        (cause) => new SeedcordError(SeedcordErrorCode.CliEdgeWranglerMissing, [dirname(wranglerConfig)], { cause })
    );
    // wrangler's types import Config from @cloudflare/workers-utils, a package seedcord doesn't install
    let config: unknown;
    try {
        // @cloudflare/vite-plugin reads the port through this call too
        config = wrangler.unstable_readConfig({ config: wranglerConfig }, { hideWarnings: true });
    } catch (error: unknown) {
        throw new SeedcordError(
            SeedcordErrorCode.CliEdgeWranglerConfigUnreadable,
            [wranglerConfig, parseFailure(error)],
            {
                cause: error
            }
        );
    }
    const dev = isPlainObject(config) ? config.dev : undefined;
    const port = isPlainObject(dev) ? dev.port : undefined;
    return typeof port === 'number' ? port : WRANGLER_DEV_PORT;
}

export async function loadCloudflare(viteRoot: string, importPlugin: ImportCloudflare): Promise<CloudflarePlugin> {
    const { cloudflare } = await importOptionalPeer(
        CLOUDFLARE_PLUGIN,
        importPlugin,
        (cause) => new SeedcordError(SeedcordErrorCode.CliEdgeVitePluginMissing, [viteRoot], { cause })
    );
    return cloudflare;
}
