import { describe, expect, it } from 'vitest';

import type { Config } from '@seedcord/types';
import type { HttpConfig } from '@src/interfaces/Config';

// a base-Config-typed fixture would carry the wide runtime key and fail the narrowed arms
function base(): Pick<Config, 'bot' | 'subscribers'> {
    return { bot: { interactions: { path: null }, commands: { path: null } }, subscribers: { path: null } };
}

describe('HttpConfig', () => {
    it('the server arm carries healthCheck', () => {
        const config: HttpConfig = { ...base(), healthCheck: { path: '/healthz' } };
        expect(config.healthCheck).toMatchObject({ path: '/healthz' });
    });

    it('the explicit server runtime carries healthCheck', () => {
        const config: HttpConfig = { ...base(), runtime: 'server', healthCheck: { path: '/healthz' } };
        expect(config.runtime).toBe('server');
    });

    it('the edge arm rejects port', () => {
        // @ts-expect-error port is a node-server option, an edge worker binds nothing
        const config: HttpConfig = { ...base(), runtime: 'edge', port: 3000 };
        expect(config.runtime).toBe('edge');
    });

    it('the edge arm rejects healthCheck', () => {
        // @ts-expect-error healthCheck is a node-server option, the edge arm has no health endpoint
        const config: HttpConfig = { ...base(), runtime: 'edge', healthCheck: { path: '/healthz' } };
        expect(config.runtime).toBe('edge');
    });
});
