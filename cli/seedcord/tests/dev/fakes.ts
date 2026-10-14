import { HostAugmentTarget, HostShutdown, HostStartup, HostVersion, SeedcordBrand } from '@seedcord/types/internal';

import { InstanceLifecycle } from '#commands/dev/runtime/InstanceLifecycle';

import type { DevRuntime } from '#commands/dev/runtime/DevRuntime';
import type { DevEvent } from '#commands/dev/runtime/events';

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

// loads `module` as the entry and runs the bot in this process
export function fakeRuntime(module: unknown, emit?: DevEvent): DevRuntime {
    const lifecycle = new InstanceLifecycle();
    return {
        start: (context) => {
            if (emit) context.onEvent?.(emit);
            return Promise.resolve();
        },
        loadEntry: () => Promise.resolve({ module }),
        startBot: (instance) => lifecycle.start(instance),
        stop: () => lifecycle.stop(),
        importModule: () => Promise.reject(new Error('the fake runtime loads no files')),
        refreshCommands: () => undefined
    };
}
