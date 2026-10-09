import { join } from 'node:path';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';

export function devConfigFor(root: string, instance: string): ResolvedSeedcordDevConfig {
    // justified: the runtime and its hmr plugin read only these four fields
    return {
        configFile: join(root, 'seedcord.config.ts'),
        root: join(root, 'src'),
        target: { kind: 'node', entry: join(root, 'src', instance) },
        instance: join(root, 'src', instance)
    } as ResolvedSeedcordDevConfig;
}
