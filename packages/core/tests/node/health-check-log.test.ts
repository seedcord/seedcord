import { describe, it, expect, vi } from 'vitest';

import { HealthCheck } from '@node/HealthCheck';

import type { CoordinatedShutdown } from '@node/Lifecycle/CoordinatedShutdown';

describe('HealthCheck listen log', () => {
    it('prints a fetchable address when no host is configured', async () => {
        // justified: the ctor only reaches addTask
        const shutdown = { addTask: vi.fn() } as unknown as CoordinatedShutdown;
        const check = new HealthCheck(shutdown, { port: 0 });
        const info = vi.spyOn(check.logger, 'info').mockImplementation(() => check.logger);

        await check.init();

        const line = info.mock.calls.map((args) => String(args[0])).join('\n');
        // the server binds all interfaces, the log shows an address a browser can open
        expect(line).toContain('localhost');
        expect(line).not.toContain('0.0.0.0');

        await check.stop();
    });
});
