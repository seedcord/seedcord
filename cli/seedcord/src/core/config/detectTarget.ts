import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { WorkerEnv } from '#core/modules/workerEnv';

export interface ServerTarget {
    kind: 'server';
}

export interface EdgeTarget {
    kind: 'edge';
    cloudflareConfig: string;
    env: WorkerEnv;
}

export type BuildTarget = ServerTarget | EdgeTarget;

// @cloudflare/vite-plugin reads only this name from vite's root
const CLOUDFLARE_CONFIG_FILENAME = 'cloudflare.config.ts';

export async function detectTarget(configDir: string, mode: string): Promise<BuildTarget> {
    const cloudflareConfig = join(configDir, CLOUDFLARE_CONFIG_FILENAME);
    if (!existsSync(cloudflareConfig)) return { kind: 'server' };
    return { kind: 'edge', cloudflareConfig, env: await WorkerEnv.load(cloudflareConfig, mode) };
}
