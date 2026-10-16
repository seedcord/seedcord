import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { isPlainObject, isStringArray } from '@seedcord/utils/internal';

// cloudflare turns on nodejs_compat by default from this compatibility date
const NODE_COMPAT_DEFAULT_FROM = '2026-08-04';

interface CompatSettings {
    date: string | undefined;
    flags: string[];
}

// cloudflare's build output spec puts worker.config.json beside the worker's bundle folder
function readCompatSettings(bundleDir: string): CompatSettings {
    const generated: unknown = JSON.parse(readFileSync(join(dirname(bundleDir), 'worker.config.json'), 'utf8'));
    const date = isPlainObject(generated) ? generated.compatibilityDate : undefined;
    const flags = isPlainObject(generated) ? generated.compatibilityFlags : undefined;
    return { date: typeof date === 'string' ? date : undefined, flags: isStringArray(flags) ? flags : [] };
}

export function assertNodeCompat(bundleDir: string, cloudflareConfig: string): void {
    const { date, flags } = readCompatSettings(bundleDir);

    if (flags.includes('no_nodejs_compat')) {
        throw new SeedcordError(SeedcordErrorCode.CliEdgeNodeCompatOff, [cloudflareConfig]);
    }
    // YYYY-MM-DD dates order the same as strings
    if (date !== undefined && date < NODE_COMPAT_DEFAULT_FROM && !flags.includes('nodejs_compat')) {
        throw new SeedcordError(SeedcordErrorCode.CliEdgeCompatDateTooOld, [
            cloudflareConfig,
            date,
            NODE_COMPAT_DEFAULT_FROM
        ]);
    }
}
