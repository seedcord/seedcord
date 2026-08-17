import { describe, it, expect, vi } from 'vitest';

import { HealthCheck } from '#node/HealthCheck';
import { ShutdownPhase } from '#src/lifecycle/phases';

import type { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';

function stubShutdown(): { shutdown: CoordinatedShutdown; addTask: ReturnType<typeof vi.fn> } {
    const addTask = vi.fn();
    // justified: fromOption only reaches addTask
    const shutdown = { addTask } as unknown as CoordinatedShutdown;
    return { shutdown, addTask };
}

describe('HealthCheck.fromOption', () => {
    it('false returns undefined and registers nothing', () => {
        const { shutdown, addTask } = stubShutdown();

        expect(HealthCheck.fromOption(shutdown, false)).toBeUndefined();
        expect(addTask).not.toHaveBeenCalled();
    });

    it('undefined registers the stop task', () => {
        const { shutdown, addTask } = stubShutdown();

        expect(HealthCheck.fromOption(shutdown, undefined)).toBeInstanceOf(HealthCheck);
        expect(addTask).toHaveBeenCalledWith(ShutdownPhase.Drain, 'stop-healthcheck-server', expect.any(Function));
    });
});
