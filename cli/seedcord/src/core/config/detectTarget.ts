import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { realPath } from '#core/project/realPath';

import type { RealPath } from '#core/project/realPath';

export interface ServerTarget {
    kind: 'server';
}

export interface EdgeTarget {
    kind: 'edge';
    cloudflareConfig: RealPath;
    viteRoot: RealPath;
}

export type BuildTarget = ServerTarget | EdgeTarget;

// @cloudflare/vite-plugin reads only this name from vite's root
const CLOUDFLARE_CONFIG_FILENAME = 'cloudflare.config.ts';

export function detectTarget(configDir: RealPath): BuildTarget {
    const cloudflareConfig = join(configDir, CLOUDFLARE_CONFIG_FILENAME);
    if (!existsSync(cloudflareConfig)) return { kind: 'server' };
    return { kind: 'edge', cloudflareConfig: realPath(cloudflareConfig), viteRoot: configDir };
}
