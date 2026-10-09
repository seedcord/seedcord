import type { Plugin } from 'vite';

export const BIND_ENV_ID = 'seedcord:bind-env';
const RESOLVED_BIND_ENV_ID = `\0${BIND_ENV_ID}`;
const CLOUDFLARE_WORKERS_ID = '\0seedcord:cloudflare-workers';

// envapt's workerd build throws on a read until something binds a source
const BIND_ENV = `import { Envapter, PortableSource } from 'envapt';
Envapter.useSource(new PortableSource(process.env));
`;

// cloudflare:workers exists only inside workerd. these are its runtime exports in @cloudflare/workers-types
const CLOUDFLARE_WORKERS = `export const env = process.env;
export const exports = {};
export const cache = {};
export const tracing = {};
export class RpcStub {}
export class RpcTarget {}
export class WorkerEntrypoint {}
export class DurableObject {}
export class WorkflowStep {}
export class WorkflowEntrypoint {}
export function waitUntil() {}
export function withEnv(_env, fn) { return fn(); }
export function withExports(_exports, fn) { return fn(); }
export function withEnvAndExports(_env, _exports, fn) { return fn(); }
`;

export function edgeStandIns(): Plugin {
    return {
        name: 'seedcord:edge-stand-ins',
        resolveId(id) {
            if (id === BIND_ENV_ID) return RESOLVED_BIND_ENV_ID;
            if (id === 'cloudflare:workers') return CLOUDFLARE_WORKERS_ID;
            return undefined;
        },
        load(id) {
            if (id === RESOLVED_BIND_ENV_ID) return BIND_ENV;
            if (id === CLOUDFLARE_WORKERS_ID) return CLOUDFLARE_WORKERS;
            return undefined;
        }
    };
}
