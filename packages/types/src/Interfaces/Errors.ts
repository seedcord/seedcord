import type { RenderContext, ReplyResponse } from './ReplyResponse';
import type { UUID } from 'node:crypto';

/**
 * Structural shape of a renderable denial. A framework `Notice` subclass satisfies it. Used to type
 * {@link ErrorsConfig.defaultError} without importing the concrete class (defined in `@seedcord/kit`).
 */
export interface RenderableNotice {
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
    defaultError?: new (uuid: UUID) => RenderableNotice;
    /**
     * discord.js API error codes the interaction error path swallows quietly instead of reporting a
     * fault, for a code thrown by the handler's own work. Empty by default, so every such code reports
     * and a real bug (a double ack from a misplaced defer) surfaces. Add a code here to swallow it once
     * you have confirmed it is an expected dead end in your bot. A swallowed code still debug-logs.
     *
     * The reply sender always swallows the harmless reply-token codes on its own send for safety,
     * independent of this list, so the error path never crashes.
     */
    ignoreApiCodes?: readonly (number | string)[];
    /**
     * discord.js API error codes the event error path swallows quietly instead of reporting a fault.
     * Discord delivers dead resources on events (a reaction on a deleted message, a member that just
     * left), so a handler's own fetch can throw a gone-resource error.
     *
     * Empty by default, so a dead resource reports (throttled to one per minute per handler) until you
     * confirm it is an expected dead end and add the code here, for example Unknown Message (10008),
     * Unknown Member (10007), Unknown User (10013). A swallowed code still debug-logs.
     */
    ignoreEventApiCodes?: readonly (number | string)[];
}
