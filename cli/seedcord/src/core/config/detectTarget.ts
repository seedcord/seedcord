import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface ServerTarget {
    kind: 'server';
}

export interface EdgeTarget {
    kind: 'edge';
    wranglerConfig: string;
}

export type BuildTarget = ServerTarget | EdgeTarget;

// wrangler reads its config from any of these
const WRANGLER_CONFIG_FILENAMES = ['wrangler.json', 'wrangler.jsonc', 'wrangler.toml'];

export function detectTarget(configDir: string): BuildTarget {
    const wranglerConfig = WRANGLER_CONFIG_FILENAMES.map((name) => join(configDir, name)).find((path) =>
        existsSync(path)
    );
    return wranglerConfig ? { kind: 'edge', wranglerConfig } : { kind: 'server' };
}
