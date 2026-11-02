// the real types don't fit this app. the global ones
// merge into the DOM's Element and the importable Request isn't the DOM's
declare module 'cloudflare:workers' {
    export abstract class WorkerEntrypoint<Env> {
        protected readonly env: Env;
        protected readonly ctx: { waitUntil(promise: Promise<unknown>): void };
        public fetch?(request: Request): Promise<Response>;
    }
}
