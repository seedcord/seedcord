import { describe, it, expect, afterEach, vi } from 'vitest';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';

describe('CoordinatedShutdown exit code', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('raises the code when a crash arrives during an in-flight shutdown', async () => {
        vi.useFakeTimers();
        const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        const shutdown = new CoordinatedShutdown();

        const sigterm = shutdown.run(0);
        await shutdown.run(1);
        await sigterm;

        await vi.runAllTimersAsync();

        expect(exit).toHaveBeenCalledWith(1);
    });

    it('keeps the first code when the second run asks for a lower one', async () => {
        vi.useFakeTimers();
        const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        const shutdown = new CoordinatedShutdown();

        const crash = shutdown.run(1);
        await shutdown.run(0);
        await crash;

        await vi.runAllTimersAsync();

        expect(exit).toHaveBeenCalledWith(1);
    });
});
