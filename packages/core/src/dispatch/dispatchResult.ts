/**
 * A middleware's `after()` receives this once the handler settles. `caught` holds the thrown value on
 * `refused` and `failed`.
 */
export type DispatchResult =
    | { readonly outcome: 'handled' }
    | { readonly outcome: 'refused' | 'failed'; readonly caught: unknown };

/**
 * One event handler's result. `handler` is its class name.
 */
export type HandlerResult = { readonly handler: string } & DispatchResult;

/**
 * What `eventDispatched` publishes for each handler that ran. `unknownException` carries the thrown
 * value under the same `event:name:handler` origin.
 */
export type HandlerOutcome = Pick<HandlerResult, 'handler' | 'outcome'>;

/**
 * An event middleware's `after()` receives this once the event finishes. `outcome` reports the
 * middleware chain alone. `handlers` holds one entry per handler that ran. A stopped chain runs none.
 */
export type EventDispatchResult =
    | { readonly outcome: 'refused' | 'failed'; readonly caught: unknown; readonly handlers: readonly [] }
    | { readonly outcome: 'handled'; readonly handlers: readonly HandlerResult[] };
