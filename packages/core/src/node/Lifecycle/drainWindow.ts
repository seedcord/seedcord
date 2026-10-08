import { settleWithin } from '#src/lifecycle/withTimeout';

import type { Logger } from '@seedcord/logger';

// gateway already used 5s. discord's 3s first-ack deadline is the floor.
export const DRAIN_WINDOW_MS = 5000;

const DRAIN_HEADROOM_MS = 1000;
export const DRAIN_TASK_TIMEOUT_MS = DRAIN_WINDOW_MS + DRAIN_HEADROOM_MS;

export async function drainInFlight(
    inFlight: ReadonlySet<Promise<unknown>>,
    timeoutMs: number,
    logger: Logger,
    label: string
): Promise<void> {
    await settleWithin(Promise.allSettled(inFlight), timeoutMs);
    // nothing cancels these before the process exits
    if (inFlight.size > 0) logger.warn(`${label}: ${String(inFlight.size)} still running when the drain window closed`);
}
