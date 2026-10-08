import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

// calling start() in here turns its synchronous throw into a rejection
async function raceTimer(
    start: () => Promise<unknown>,
    timeoutMs: number,
    onTimeout: (resolve: () => void, reject: (error: unknown) => void) => void
): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    try {
        await Promise.race([
            start(),
            new Promise<void>((resolve, reject) => {
                // node's timer can go off before performance.now() reaches timeoutMs
                const expiresAt = performance.now() + timeoutMs;
                const tick = (): void => {
                    const remaining = expiresAt - performance.now();
                    if (remaining > 0) {
                        timer = setTimeout(tick, remaining);
                        return;
                    }
                    onTimeout(resolve, reject);
                };
                timer = setTimeout(tick, timeoutMs);
            })
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

// rejects with a LifecycleTaskTimeout when run outlasts the bound
export function withTimeout(name: string, run: () => Promise<void>, timeoutMs: number): Promise<void> {
    return raceTimer(run, timeoutMs, (_, reject) => {
        reject(new SeedcordError(SeedcordErrorCode.LifecycleTaskTimeout, [name, timeoutMs]));
    });
}

// the caller does not get work's rejection
export function settleWithin(work: Promise<unknown>, timeoutMs: number): Promise<void> {
    return raceTimer(
        () =>
            work.then(
                () => undefined,
                () => undefined
            ),
        timeoutMs,
        (resolve) => resolve()
    );
}
