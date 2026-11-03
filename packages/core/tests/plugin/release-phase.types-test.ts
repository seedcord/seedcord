import { ShutdownPhase } from '#src/lifecycle/phases';
import { Plugin } from '#src/plugin/Plugin';

import type { CoreBase } from '#interfaces/CoreBase';
import type { ShutdownTasks } from '#node/Lifecycle/CoordinatedShutdown';

declare const shutdown: ShutdownTasks;

shutdown.addTask(ShutdownPhase.Logout, 'flush', () => Promise.resolve());
// @ts-expect-error a bot's own task would race the config.kv close in Release
shutdown.addTask(ShutdownPhase.Release, 'flush', () => Promise.resolve());

export class LateDispose extends Plugin {
    // justified: never invoked, this fixture exists for type probes only
    public init(): Promise<void> {
        return Promise.resolve();
    }
    constructor(host: CoreBase) {
        // @ts-expect-error a plugin's dispose() would race the config.kv close in Release
        super(host, { dispose: { phase: ShutdownPhase.Release } });
    }
}
