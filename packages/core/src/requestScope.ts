import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
    waitUntil(work: Promise<unknown>): void;
}

// InFlight.admit and the edge Seedcord.fetch run their work inside this
export const requestScope = new AsyncLocalStorage<RequestContext>();

// no store means we're outside a request, like dev startup. nothing to keep open then
export function keepRequestOpenFor(work: Promise<unknown>): void {
    requestScope.getStore()?.waitUntil(work);
}
