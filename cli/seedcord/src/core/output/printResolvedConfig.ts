import { paint } from '@seedcord/errors';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';
import type { Steps } from './Steps';

export function printResolvedConfig(steps: Steps<string>, config: ResolvedSeedcordDevConfig): void {
    steps.detail('config', paint.path(config.configFile));
    steps.detail('root', paint.path(config.root));
    steps.detail('instance', paint.path(config.instance));
    const { target } = config;
    if (target.kind === 'server') steps.detail('entry', paint.path(target.entry));
    else steps.detail('wrangler', paint.path(target.wranglerConfig));
    steps.detail('outDir', paint.path(config.build.outDir));
}
