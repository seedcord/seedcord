import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { isPlainObject } from '@seedcord/utils/internal';

// cloudflare turns on nodejs_compat by default from this compatibility date
const NODE_COMPAT_DEFAULT_FROM = '2026-08-04';

interface CompatSettings {
    date: string | undefined;
    flags: string[];
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

// the plugin writes wrangler.jsonc and wrangler.toml out as this one json shape
function readCompatSettings(outDir: string): CompatSettings {
    const generated: unknown = JSON.parse(readFileSync(join(outDir, 'wrangler.json'), 'utf8'));
    const date = isPlainObject(generated) ? generated.compatibility_date : undefined;
    const flags = isPlainObject(generated) ? generated.compatibility_flags : undefined;
    return { date: typeof date === 'string' ? date : undefined, flags: isStringArray(flags) ? flags : [] };
}

export function assertNodeCompat(outDir: string, wranglerConfig: string): void {
    const { date, flags } = readCompatSettings(outDir);

    if (flags.includes('no_nodejs_compat')) {
        throw new SeedcordError(SeedcordErrorCode.CliEdgeNodeCompatOff, [wranglerConfig]);
    }
    // YYYY-MM-DD dates order the same as strings
    if (date !== undefined && date < NODE_COMPAT_DEFAULT_FROM && !flags.includes('nodejs_compat')) {
        throw new SeedcordError(SeedcordErrorCode.CliEdgeCompatDateTooOld, [
            wranglerConfig,
            date,
            NODE_COMPAT_DEFAULT_FROM
        ]);
    }
}
