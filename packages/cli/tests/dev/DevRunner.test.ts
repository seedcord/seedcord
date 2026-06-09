import { describe, expect, it, vi } from 'vitest';

import { DevRunner } from '@commands/dev/DevRunner';

import type { CodegenRunner } from '@commands/codegen/CodegenRunner';
import type { ConfigLoader } from '@core/config/ConfigLoader';
import type { ConfigLocator } from '@core/config/ConfigLocator';
import type { ILogger } from '@seedcord/types';
import type { DevStore } from '@ui/stores/DevStore';

const silentLogger: ILogger = {
    error: () => undefined,
    warn: () => undefined,
    info: () => undefined,
    http: () => undefined,
    verbose: () => undefined,
    debug: () => undefined,
    silly: () => undefined
};

// justified: refreshCommands only reads the injected codegen and the (null) session, so the locator, config
// loader, and store are never touched and can be empty stand-ins.
function makeRunner(codegen: { run: ReturnType<typeof vi.fn> }): DevRunner {
    return new DevRunner(
        {} as unknown as ConfigLocator,
        {} as unknown as ConfigLoader,
        {} as unknown as DevStore,
        codegen as unknown as CodegenRunner,
        silentLogger
    );
}

describe('DevRunner command refresh', () => {
    it('regenerates the registry when a refresh is accepted', async () => {
        const codegen = { run: vi.fn().mockResolvedValue(undefined) };
        makeRunner(codegen).refreshCommands(true);
        await vi.waitFor(() => {
            expect(codegen.run).toHaveBeenCalledWith(false);
        });
    });

    it('does not regenerate when a refresh is declined', () => {
        const codegen = { run: vi.fn().mockResolvedValue(undefined) };
        makeRunner(codegen).refreshCommands(false);
        expect(codegen.run).not.toHaveBeenCalled();
    });

    it('swallows a regeneration failure so the dev session keeps running', async () => {
        const codegen = { run: vi.fn().mockRejectedValue(new Error('duplicate route')) };
        makeRunner(codegen).refreshCommands(true);
        await vi.waitFor(() => {
            expect(codegen.run).toHaveBeenCalledWith(false);
        });
    });
});
