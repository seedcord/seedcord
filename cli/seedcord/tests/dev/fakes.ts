import { HostAugmentTarget, HostShutdown, HostStartup, HostVersion, SeedcordBrand } from '@seedcord/types/internal';

import { InstanceLifecycle } from '#commands/dev/runtime/InstanceLifecycle';
import { emptyModuleGraph } from '#tests/emptyModuleGraph';

import type { DevRuntime } from '#commands/dev/runtime/DevRuntime';
import type { DevEvent, DevEventHandler } from '#commands/dev/runtime/events';

// the fields the dev session and InstanceLifecycle read off a bot
export function fakeBot(overrides: Record<PropertyKey, unknown> = {}): Record<PropertyKey, unknown> {
    return {
        [SeedcordBrand]: true,
        [HostVersion]: '1.2.3',
        [HostAugmentTarget]: '@seedcord/gateway',
        start: () => Promise.resolve(),
        [HostStartup]: { abort: () => undefined },
        [HostShutdown]: { run: () => Promise.resolve() },
        ...overrides
    };
}

// runs `module` as the bot in this process. `emit` goes out from startBot, where a real runtime reports the port
export function fakeRuntime(module: unknown, emit?: DevEvent): DevRuntime {
    const lifecycle = new InstanceLifecycle();
    let onEvent: DevEventHandler | undefined;
    return {
        start: (context) => {
            onEvent = context.onEvent;
            return Promise.resolve();
        },
        loadEntry: () => Promise.resolve({ module }),
        startBot: (instance) => {
            if (emit) onEvent?.(emit);
            return lifecycle.start(instance);
        },
        stop: () => lifecycle.stop(),
        importModule: () => Promise.reject(new Error('the fake runtime loads no files')),
        ...emptyModuleGraph,
        refreshCommands: () => undefined
    };
}
