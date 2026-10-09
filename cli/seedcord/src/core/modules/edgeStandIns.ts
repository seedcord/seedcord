import type { Plugin } from 'vite';

export const BIND_ENV_ID = 'seedcord:bind-env';
const RESOLVED_BIND_ENV_ID = `\0${BIND_ENV_ID}`;
const CLOUDFLARE_WORKERS_ID = '\0seedcord:cloudflare-workers';

// envapt's workerd build throws on a read until something binds a source
const BIND_ENV = `import { Envapter, PortableSource } from 'envapt';
Envapter.useSource(new PortableSource(process.env));
`;

// cloudflare:workers exists only inside workerd
const CLOUDFLARE_WORKERS = 'export const env = process.env;\n';

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
