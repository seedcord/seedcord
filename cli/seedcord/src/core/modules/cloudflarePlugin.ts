import { randomUUID } from 'node:crypto';

import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { hasErrorCode } from '@seedcord/utils/internal';
import { resolve } from 'import-meta-resolve';

import type * as CloudflareVitePlugin from '@cloudflare/vite-plugin';

export type CloudflarePlugin = typeof CloudflareVitePlugin.cloudflare;
export type ImportCloudflare = () => Promise<typeof CloudflareVitePlugin>;
export type ImportFromCloudflarePlugin = typeof importFromCloudflarePlugin;

export const CLOUDFLARE_PLUGIN = '@cloudflare/vite-plugin';

// the importer's path at the end of node's message can hold the name too
export function isPackageMissing(error: unknown, name: string): boolean {
    return hasErrorCode(error, 'ERR_MODULE_NOT_FOUND') && error.message.startsWith(`Cannot find package '${name}'`);
}

export function cloudflarePluginMissing(projectDir: string, cause: unknown): SeedcordError {
    const why = `${paint.bold('seedcord dev')} and ${paint.bold('seedcord build')} run an edge bot through it.`;
    return new SeedcordError(SeedcordErrorCode.CliDependencyMissing, [[CLOUDFLARE_PLUGIN], projectDir, why], { cause });
}

// resolve finds the optional peer through seedcord's own folder in node_modules
export function importCloudflare(): Promise<typeof CloudflareVitePlugin> {
    // justified: the URL resolves to the module the type import reads
    return import(import.meta.resolve(CLOUDFLARE_PLUGIN)) as Promise<typeof CloudflareVitePlugin>;
}

// a copy at another version than the plugin's can parse cloudflare.config.ts or .cloudflare/output differently
export async function importFromCloudflarePlugin<Module>(name: string): Promise<Module> {
    // node's import.meta.resolve ignores a parent without --experimental-import-meta-resolve
    const url = resolve(name, import.meta.resolve(CLOUDFLARE_PLUGIN));
    // justified: the caller passes the type of the module that name resolves to
    return (await import(url)) as Module;
}

// cloudflare/workers-sdk#16346, remove once it's fixed
// after a worker fails to start, every later preview through the same copy throws ERR_DISPOSED
// a UUID because a counter would restart at 0 in each test file
export function importCloudflareCopy(): Promise<typeof CloudflareVitePlugin> {
    const url = `${import.meta.resolve(CLOUDFLARE_PLUGIN)}?copy=${randomUUID()}`;
    // justified: the URL resolves to the module the type import reads
    return import(url) as Promise<typeof CloudflareVitePlugin>;
}
