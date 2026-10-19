import { paint } from '@seedcord/errors';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { Steps } from './Steps';

export function printResolvedConfig(steps: Steps<string>, config: ResolvedSeedcordConfig): void {
    steps.detail('config', paint.path(config.configFile));
    steps.detail('root', paint.path(config.root));
    steps.detail('instance', paint.path(config.instance));
    const { target } = config;
    if (target.kind === 'edge') {
        steps.detail('cloudflare', paint.path(target.cloudflareConfig));
        return;
    }
    if (target.start !== undefined) steps.detail('start', paint.path(target.start));
    steps.detail('outDir', paint.path(target.outDir));
}
