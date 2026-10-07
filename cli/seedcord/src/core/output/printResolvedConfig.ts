import { paint } from '@seedcord/errors';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';
import type { Steps } from './Steps';

export function printResolvedConfig(steps: Steps<string>, config: ResolvedSeedcordDevConfig): void {
    steps.detail('config', paint.path(config.configFile));
    steps.detail('root', paint.path(config.root));
    steps.detail('instance', paint.path(config.instance));
    steps.detail('entry', paint.path(config.entry));
    steps.detail('outDir', paint.path(config.build.outDir));
}
