import { testConfig } from '../utils/test-config';

import type { GatewayConfig } from '#interfaces/Config';

const server: GatewayConfig = { ...testConfig(), runtime: 'server' };
void server;

// @ts-expect-error the gateway websocket needs a persistent process, edge does not type-check
const edge: GatewayConfig = { ...testConfig(), runtime: 'edge' };
void edge;
