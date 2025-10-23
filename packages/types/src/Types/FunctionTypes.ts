/**
 * Represents any function type
 */
export type AnyFunction = (...args: any[]) => unknown;

/**
 * Represents any asynchronous function type
 */
export type AnyAsyncFunction = (...args: any[]) => Promise<unknown>;
