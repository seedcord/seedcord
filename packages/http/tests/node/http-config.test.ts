import { describe, it } from 'vitest';

import type { HttpEdgeConfig, HttpServerConfig } from '#src/interfaces/Config';
import type { Config } from '@seedcord/types';

function base(): Pick<Config, 'bot' | 'subscribers'> {
    return { bot: { interactions: { path: null }, commands: { path: null } }, subscribers: { path: null } };
}

describe('HttpConfig', () => {
    it('the server config carries port', () => {
        const config: HttpServerConfig = { ...base(), port: 4000 };
        void config;
    });

    it('the edge config rejects port', () => {
        // @ts-expect-error port is a node-server option, an edge worker binds nothing
        const config: HttpEdgeConfig = { ...base(), port: 3000 };
        void config;
    });
});
