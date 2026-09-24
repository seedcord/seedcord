import { join } from 'node:path';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';

export function devConfigFor(root: string, instance: string): ResolvedSeedcordDevConfig {
    // justified: the runtime reads only these three fields on the way to loadEntry
    return {
        configFile: join(root, 'seedcord.config.ts'),
        root: join(root, 'src'),
        instance: join(root, 'src', instance)
    } as ResolvedSeedcordDevConfig;
}
