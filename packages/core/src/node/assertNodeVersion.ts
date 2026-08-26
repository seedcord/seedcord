import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

// every seedcord package declares engines.node as `>=major.minor`
const RANGE = /^>=\s*(\d+)\.(\d+)/;
const VERSION = /^v?(\d+)\.(\d+)/;

/** @internal */
export function assertNodeVersion(range: string, running: string): void {
    const required = RANGE.exec(range);
    const current = VERSION.exec(running);
    if (!required || !current) return;

    const [, requiredMajor, requiredMinor] = required;
    const [, currentMajor, currentMinor] = current;

    const meetsRange =
        Number(currentMajor) > Number(requiredMajor) ||
        (Number(currentMajor) === Number(requiredMajor) && Number(currentMinor) >= Number(requiredMinor));
    if (meetsRange) return;

    throw new SeedcordError(SeedcordErrorCode.UnsupportedNodeVersion, [range, running]);
}
