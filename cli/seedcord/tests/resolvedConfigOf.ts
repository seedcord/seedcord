import { join } from 'node:path';

import { realPath } from '#core/project/realPath';
import { vitePluginsOf } from '#tests/vitePluginsOf';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { RealPath } from '#core/project/realPath';

// what ProjectLoader resolves for a server bot with its config in projectDir and its code in src
export function resolvedConfigOf(
    projectDir: string,
    fields: Partial<ResolvedSeedcordConfig> = {}
): ResolvedSeedcordConfig {
    const at = (path: string): RealPath => realPath(join(projectDir, path));
    return {
        configFile: at('seedcord.config.ts'),
        root: at('src'),
        instance: at('src/bot.ts'),
        target: { kind: 'server', start: at('src/index.ts'), outDir: at('dist') },
        build: {},
        files: [],
        typecheck: { enabled: false },
        idleAnimation: true,
        tunnel: { mode: 'quick' },
        viteMode: 'development',
        vitePlugins: vitePluginsOf(),
        make: { templates: at('templates'), helpers: {} },
        ...fields
    };
}
