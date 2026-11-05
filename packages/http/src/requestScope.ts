import { AsyncLocalStorage } from 'node:async_hooks';

/** Matches the shape of the Workers `ExecutionContext`. Work that continues after the 202 response runs under its `waitUntil`. */
export interface EngineContext {
    waitUntil(promise: Promise<unknown>): void;
}

// edge Seedcord.fetch and NodeEndpoint run each request inside this with its ctx.
// anything that request kicks off, even a subscriber publishing way later, gets the same ctx back
export const requestScope = new AsyncLocalStorage<EngineContext>();

// no store means we're outside a request, like dev startup. nothing to keep open then
export function keepRequestOpenFor(work: Promise<unknown>): void {
    requestScope.getStore()?.waitUntil(work);
}
