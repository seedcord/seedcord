import type { RenderContext, ReplyResponse } from './ReplyResponse';
import type { UUID } from 'node:crypto';

/**
 * Structural shape of a renderable denial. A framework `Denial` subclass satisfies it. Used to type
 * {@link ErrorsConfig.defaultError} without importing the concrete class (defined in `@seedcord/kit`).
 */
export interface RenderableDenial {
    /** Whether the denial is a reported fault. */
    readonly report: boolean;
    /** Builds the user-facing reply. */
    render(ctx: RenderContext): ReplyResponse;
}

/**
 * Settings for how the framework renders errors and reports faults.
 */
export interface ErrorsConfig {
    /**
     * Whether to show the error stack trace in the terminal for an unknown fault.
     *
     * `false` by default.
     */
    errorStack?: boolean;
    /**
     * Class the framework constructs to render an unknown, non-denial fault. It receives the fault's
     * tracking uuid.
     *
     * Defaults to the framework's generic error.
     */
    defaultError?: new (uuid: UUID) => RenderableDenial;
}
