import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

// every seedcord package declares engines.node as `>=major` or `>=major.minor`
const RANGE = new RegExp(String.raw`^>=(\d+)(?:\.(\d+))?`);
const VERSION = /^v?(\d+)\.(\d+)/;
const SPACES = /\s/g;

/** @internal */
export function assertNodeVersion(range: string, running: string): void {
    const required = RANGE.exec(range.replaceAll(SPACES, ''));
    const current = VERSION.exec(running);
    if (!required || !current) return;

    const [, requiredMajor, requiredMinor = '0'] = required;
    const [, currentMajor, currentMinor] = current;

    const meetsRange =
        Number(currentMajor) > Number(requiredMajor) ||
        (Number(currentMajor) === Number(requiredMajor) && Number(currentMinor) >= Number(requiredMinor));
    if (meetsRange) return;

    throw new SeedcordError(SeedcordErrorCode.UnsupportedNodeVersion, [range, running]);
}
