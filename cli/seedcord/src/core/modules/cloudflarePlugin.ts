import { randomUUID } from 'node:crypto';

import { hasErrorCode } from '@seedcord/utils/internal';

import type * as CloudflareVitePlugin from '@cloudflare/vite-plugin';

export type CloudflarePlugin = typeof CloudflareVitePlugin.cloudflare;
export type ImportCloudflare = () => Promise<typeof CloudflareVitePlugin>;

// the importer's path at the end of node's message can hold the name too
export function isPackageMissing(error: unknown, name: string): boolean {
    return hasErrorCode(error, 'ERR_MODULE_NOT_FOUND') && error.message.startsWith(`Cannot find package '${name}'`);
}

// resolve finds the optional peer through seedcord's own folder in node_modules
export function importCloudflare(): Promise<typeof CloudflareVitePlugin> {
    // justified: the URL resolves to the module the type import reads
    return import(import.meta.resolve('@cloudflare/vite-plugin')) as Promise<typeof CloudflareVitePlugin>;
}

// cloudflare/workers-sdk#16346, remove once it's fixed
// after a worker fails to start, every later preview through the same copy throws ERR_DISPOSED
// a UUID because a counter would restart at 0 in each test file
export function importCloudflareCopy(): Promise<typeof CloudflareVitePlugin> {
    const url = `${import.meta.resolve('@cloudflare/vite-plugin')}?copy=${randomUUID()}`;
    // justified: the URL resolves to the module the type import reads
    return import(url) as Promise<typeof CloudflareVitePlugin>;
}
