import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

async function raceTimer(
    work: Promise<unknown>,
    timeoutMs: number,
    onTimeout: (resolve: () => void, reject: (error: unknown) => void) => void
): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    try {
        await Promise.race([
            work,
            new Promise<void>((resolve, reject) => {
                timer = setTimeout(() => onTimeout(resolve, reject), timeoutMs);
            })
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/** @internal rejects with a `LifecycleTaskTimeout` when `run` outlasts the bound. */
export function withTimeout(name: string, run: () => Promise<void>, timeoutMs: number): Promise<void> {
    return raceTimer(run(), timeoutMs, (_, reject) => {
        reject(new SeedcordError(SeedcordErrorCode.LifecycleTaskTimeout, [name, timeoutMs]));
    });
}

/** @internal resolves when `work` settles or the bound elapses, whichever is first. */
export function settleWithin(work: Promise<unknown>, timeoutMs: number): Promise<void> {
    return raceTimer(work, timeoutMs, (resolve) => resolve());
}
