import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
    waitUntil(work: Promise<unknown>): void;
}

// WebServer.fetch and the edge Seedcord.fetch run each request inside this
export const requestScope = new AsyncLocalStorage<RequestContext>();

// no store means we're outside a request, like dev startup. nothing to keep open then
export function keepRequestOpenFor(work: Promise<unknown>): void {
    requestScope.getStore()?.waitUntil(work);
}
