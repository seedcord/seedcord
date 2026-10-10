import { asError } from '@seedcord/utils/internal';

import { outcomeFor } from './dispatchReport';

import type { DispatchResult, EventDispatchResult, HandlerResult } from './dispatchResult';
import type { Logger } from '@seedcord/logger';

interface Afterable<Result> {
    after?(result: Result): Promise<void>;
}

/** @internal */
export function resultFor(caught: unknown): DispatchResult {
    return { outcome: outcomeFor(caught), caught };
}

/**
 * Builds what an event middleware's `after()` receives. `handlers` is empty exactly when the chain
 * stopped the event.
 *
 * @internal
 */
export function eventResultFor(
    stopped: { caught: unknown } | null,
    handlers: readonly HandlerResult[]
): EventDispatchResult {
    if (!stopped) return { outcome: 'handled', handlers };
    return { ...resultFor(stopped.caught), handlers: [] };
}

/**
 * Calls `after()` on each middleware that ran, newest first. A throw inside one is logged. Every
 * remaining middleware still gets its call.
 *
 * @internal
 */
export async function runAfter<Result>(
    ran: readonly Afterable<Result>[],
    result: Result,
    logger: Logger
): Promise<void> {
    for (let index = ran.length - 1; index >= 0; index--) {
        const middleware = ran[index];
        try {
            await middleware?.after?.(result);
        } catch (caught) {
            logger.error(`${middleware?.constructor.name ?? 'A middleware'} threw from after()`, asError(caught));
        }
    }
}
