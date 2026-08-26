import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { ShutdownPhase, StartupPhase } from '#src/lifecycle/phases';

/**
 * Sets when a plugin's lifecycle methods run. Pass it as the second argument to `super()`. Omit a
 * field to keep its default.
 *
 * @see {@link StartupPhase}
 * @see {@link ShutdownPhase}
 * @example
 * ```ts
 * super(host, { init: { phase: StartupPhase.Login }, dispose: { timeout: 30_000 } });
 * ```
 */
export interface PluginLifecycleSpec {
    /**
     * Defaults to `StartupPhase.Configuration` and 15000ms. Set the phase to `Ready` and `init()`
     * runs ahead of every plugin's `ready()`.
     */
    init?: { phase?: StartupPhase; timeout?: number };
    /** `ready()` always runs in `StartupPhase.Ready`. Defaults to a 15000ms timeout. */
    ready?: { timeout?: number };
    /** Defaults to `ShutdownPhase.Disconnect` and 10000ms. */
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
