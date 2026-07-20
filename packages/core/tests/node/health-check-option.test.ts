import { describe, it, expect, vi } from 'vitest';

import { HealthCheck } from '@node/HealthCheck';

import type { CoordinatedShutdown } from '@node/Lifecycle/CoordinatedShutdown';

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

    it('undefined returns the defaults', () => {
        const { shutdown } = stubShutdown();
        const check = HealthCheck.fromOption(shutdown, undefined);

        expect(check).toBeInstanceOf(HealthCheck);
        expect(check?.port).toBe(6967);
        expect(check?.path).toBe('/health');
    });

    it('true returns the defaults', () => {
        const { shutdown } = stubShutdown();

        expect(HealthCheck.fromOption(shutdown, true)?.port).toBe(6967);
    });

    it('an options object is applied', () => {
        const { shutdown } = stubShutdown();
        const check = HealthCheck.fromOption(shutdown, { port: 7000, path: '/ready' });

        expect(check?.port).toBe(7000);
        expect(check?.path).toBe('/ready');
    });
});
