import { describe, it, expect, vi } from 'vitest';

import { HealthCheck } from '@node/HealthCheck';

import type { CoordinatedShutdown } from '@node/Lifecycle/CoordinatedShutdown';

// stop() settles only in the close callback. A second settle source (a 'close'-event listener)
// would race the callback, this pins that both concurrent stops settle through the one path.
describe('HealthCheck.stop', () => {
    it('concurrent stops both settle and the server ends closed', async () => {
        // justified: the ctor only reaches addTask
        const shutdown = { addTask: vi.fn() } as unknown as CoordinatedShutdown;
        const check = new HealthCheck(shutdown, { port: 0 });
        await check.init();

        await expect(Promise.all([check.stop(), check.stop()])).resolves.toBeDefined();
        await expect(check.stop()).resolves.toBeUndefined();
    });
});
