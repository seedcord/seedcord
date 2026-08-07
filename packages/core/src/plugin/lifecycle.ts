import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { ShutdownPhase, StartupPhase } from '@src/lifecycle/phases';

/**
 * The lifecycle a plugin declares through `super(host, spec)`. Unset fields resolve to the base
 * defaults. `ready` runs at a fixed `StartupPhase.Ready`.
 */
export interface PluginLifecycleSpec {
    init?: { phase?: StartupPhase; timeout?: number };
    ready?: { timeout?: number };
    dispose?: { phase?: ShutdownPhase; timeout?: number };
}

/** @internal */
export interface ResolvedPluginLifecycleSpec {
    readonly init: { readonly phase: StartupPhase; readonly timeout: number };
    readonly ready: { readonly timeout: number };
    readonly dispose: { readonly phase: ShutdownPhase; readonly timeout: number };
}

const DEFAULT_INIT_TIMEOUT_MS = 15_000;
const DEFAULT_READY_TIMEOUT_MS = 15_000;
const DEFAULT_DISPOSE_TIMEOUT_MS = 10_000;

function timeoutOf(
    field: 'init' | 'ready' | 'dispose',
    declared: number | undefined,
    fallback: number,
    pluginName: string
): number {
    if (declared === undefined) return fallback;
    if (!Number.isFinite(declared) || declared <= 0) {
        throw new SeedcordError(SeedcordErrorCode.PluginOptionsRejected, [
            pluginName,
            `lifecycle ${field}.timeout must be a positive number of milliseconds`
        ]);
    }
    return declared;
}

/** @internal */
export function resolveLifecycleSpec(
    spec: PluginLifecycleSpec | undefined,
    pluginName: string
): ResolvedPluginLifecycleSpec {
    return {
        init: {
            phase: spec?.init?.phase ?? StartupPhase.Configuration,
            timeout: timeoutOf('init', spec?.init?.timeout, DEFAULT_INIT_TIMEOUT_MS, pluginName)
        },
        ready: {
            timeout: timeoutOf('ready', spec?.ready?.timeout, DEFAULT_READY_TIMEOUT_MS, pluginName)
        },
        dispose: {
            phase: spec?.dispose?.phase ?? ShutdownPhase.Disconnect,
            timeout: timeoutOf('dispose', spec?.dispose?.timeout, DEFAULT_DISPOSE_TIMEOUT_MS, pluginName)
        }
    };
}
