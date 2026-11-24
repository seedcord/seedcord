import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { checkRuntime } from './checkRuntime';

import type { RuntimeCheck } from './checkRuntime';

export function assertDeclaredRuntime(): Exclude<RuntimeCheck, { status: 'unsupported' }> {
    const check = checkRuntime();
    if (check.status === 'unsupported') {
        throw new SeedcordError(SeedcordErrorCode.UnsupportedRuntimeVersion, [check.name, check.range, check.running]);
    }
    return check;
}
