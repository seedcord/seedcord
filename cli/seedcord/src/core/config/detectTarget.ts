import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface ServerTarget {
    kind: 'server';
}

export interface EdgeTarget {
    kind: 'edge';
    cloudflareConfig: string;
}

export type BuildTarget = ServerTarget | EdgeTarget;

// @cloudflare/vite-plugin reads only this name from vite's root
const CLOUDFLARE_CONFIG_FILENAME = 'cloudflare.config.ts';

export function detectTarget(configDir: string): BuildTarget {
    const cloudflareConfig = join(configDir, CLOUDFLARE_CONFIG_FILENAME);
    return existsSync(cloudflareConfig) ? { kind: 'edge', cloudflareConfig } : { kind: 'server' };
}
