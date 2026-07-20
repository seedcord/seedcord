import { describe, expect, it } from 'vitest';

import { testConfig } from '../utils/test-config';

import type { GatewayConfig } from '@interfaces/Config';

describe('GatewayConfig', () => {
    it('runtime narrows to server', () => {
        const config: GatewayConfig = { ...testConfig(), runtime: 'server' };
        expect(config.runtime).toBe('server');

        // @ts-expect-error a gateway bot holds a websocket, it cannot target edge
        const edge: GatewayConfig = { ...testConfig(), runtime: 'edge' };
        expect(edge).toBeDefined();
    });
});
