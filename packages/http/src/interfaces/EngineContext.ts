/** Matches the shape of the Workers `ExecutionContext`. Work that continues after the 202 response runs under its `waitUntil`. */
export interface EngineContext {
    waitUntil(promise: Promise<unknown>): void;
}
