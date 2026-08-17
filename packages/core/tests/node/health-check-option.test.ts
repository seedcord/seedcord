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

    it('undefined takes the defaults and registers the stop task', () => {
        const { shutdown, addTask } = stubShutdown();

        const check = HealthCheck.fromOption(shutdown, undefined);

        expect(check?.port).toBe(6967);
        expect(check?.path).toBe('/health');
        expect(addTask).toHaveBeenCalledWith(ShutdownPhase.Drain, 'stop-healthcheck-server', expect.any(Function));
    });

    it('applies an options object', () => {
        const { shutdown } = stubShutdown();

        const check = HealthCheck.fromOption(shutdown, { port: 7000, host: '0.0.0.0', path: '/ready' });

        expect(check?.port).toBe(7000);
        expect(check?.host).toBe('0.0.0.0');
        expect(check?.path).toBe('/ready');
    });
});
