import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { BuiltWorker } from './CloudflareWorker';

// cloudflare turns on nodejs_compat by default from this compatibility date
const NODE_COMPAT_DEFAULT_FROM = '2026-08-04';

export function assertNodeCompat({ config }: BuiltWorker, cloudflareConfig: string): void {
    const { compatibilityDate: date, compatibilityFlags: flags = [] } = config;

    if (flags.includes('no_nodejs_compat')) {
        throw new SeedcordError(SeedcordErrorCode.CliEdgeNodeCompatOff, [cloudflareConfig]);
    }
    // YYYY-MM-DD dates order the same as strings
    if (date < NODE_COMPAT_DEFAULT_FROM && !flags.includes('nodejs_compat')) {
        throw new SeedcordError(SeedcordErrorCode.CliEdgeCompatDateTooOld, [
            cloudflareConfig,
            date,
            NODE_COMPAT_DEFAULT_FROM
        ]);
    }
}
