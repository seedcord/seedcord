import { describe, expect, it } from 'vitest';

import type { HttpConfig } from '#src/interfaces/Config';
import type { Config } from '@seedcord/types';

// a base-Config-typed fixture would carry the wide runtime key and fail the narrowed arms
function base(): Pick<Config, 'bot' | 'subscribers'> {
    return { bot: { interactions: { path: null }, commands: { path: null } }, subscribers: { path: null } };
}

describe('HttpConfig', () => {
    it('the server arm carries port', () => {
        const config: HttpConfig = { ...base(), runtime: 'server', port: 4000 };

        expect(config.port).toBe(4000);
    });

    it('the edge arm rejects port', () => {
        // @ts-expect-error port is a node-server option, an edge worker binds nothing
        const config: HttpConfig = { ...base(), runtime: 'edge', port: 3000 };

        expect(config.runtime).toBe('edge');
    });
});
