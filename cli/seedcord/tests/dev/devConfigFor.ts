import { join } from 'node:path';

import { StateFolder } from '#core/state/StateFolder';
import { silentLogger } from '#tests/silentLogger';

import type { DevRuntimeContext } from '#commands/dev/runtime/DevRuntime';
import type { ResolvedSeedcordConfig } from '#core/config/schema';

export function devConfigFor(root: string, instance: string): ResolvedSeedcordConfig {
    // justified: the runtime and its hmr plugin read only these five fields
    return {
        configFile: join(root, 'seedcord.config.ts'),
        root: join(root, 'src'),
        target: { kind: 'server', entry: join(root, 'src', instance) },
        instance: join(root, 'src', instance),
        tunnel: { mode: 'quick' }
    } as ResolvedSeedcordConfig;
}

export function devContextFor(root: string, instance: string): DevRuntimeContext {
    return { config: devConfigFor(root, instance), state: new StateFolder(root, silentLogger) };
}
