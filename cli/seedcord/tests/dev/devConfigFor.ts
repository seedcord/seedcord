import { join } from 'node:path';

import { ProjectFiles } from '#core/project/ProjectFiles';
import { realPath } from '#core/project/realPath';
import { StateFolder } from '#core/state/StateFolder';
import { resolvedConfigOf } from '#tests/resolvedConfigOf';
import { silentLogger } from '#tests/silentLogger';

import type { DevRuntimeContext } from '#commands/dev/runtime/DevRuntime';
import type { ResolvedSeedcordConfig } from '#core/config/schema';

export function devConfigFor(root: string, instance: string): ResolvedSeedcordConfig {
    const entry = realPath(join(root, 'src', instance));
    return resolvedConfigOf(root, {
        instance: entry,
        target: { kind: 'server', start: entry, outDir: realPath(join(root, 'dist')) }
    });
}

export function devContextFor(root: string, instance: string): DevRuntimeContext {
    const config = devConfigFor(root, instance);
    return { config, files: new ProjectFiles(config), state: new StateFolder(root, silentLogger) };
}
