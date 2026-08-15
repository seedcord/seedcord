import { describe, expect, it } from 'vitest';

import { testConfig } from '../utils/test-config';

import type { GatewayConfig } from '#interfaces/Config';

describe('GatewayConfig', () => {
    it('runtime narrows to server', () => {
        const config: GatewayConfig = { ...testConfig(), runtime: 'server' };
        expect(config.runtime).toBe('server');

        // @ts-expect-error the gateway websocket needs a persistent process, edge does not type-check
        const edge: GatewayConfig = { ...testConfig(), runtime: 'edge' };
        expect(edge.runtime).toBe('edge');
    });
});
