import { join } from 'node:path';

import { StateFolder } from '#core/state/StateFolder';
import { silentLogger } from '#tests/silentLogger';
import { vitePluginsOf } from '#tests/vitePluginsOf';

import type { DevRuntimeContext } from '#commands/dev/runtime/DevRuntime';
import type { ResolvedSeedcordConfig } from '#core/config/schema';

export function devConfigFor(root: string, instance: string): ResolvedSeedcordConfig {
    return {
        configFile: join(root, 'seedcord.config.ts'),
        root: join(root, 'src'),
        target: { kind: 'server', start: join(root, 'src', instance), outDir: join(root, 'dist') },
        instance: join(root, 'src', instance),
        tunnel: { mode: 'quick' },
        build: {},
        files: [],
        typecheck: { enabled: false },
        idleAnimation: true,
        viteMode: 'development',
        vitePlugins: vitePluginsOf()
    };
}

export function devContextFor(root: string, instance: string): DevRuntimeContext {
    return { config: devConfigFor(root, instance), state: new StateFolder(root, silentLogger) };
}
