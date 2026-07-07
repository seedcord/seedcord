import type { DevEvent } from '@commands/dev/runtime/events';
import type { DevStore } from '@ui/stores/DevStore';

export type PreviewLogLevel = 'info' | 'warn' | 'error' | 'debug' | 'http' | 'verbose';

/**
 * The surface a scenario uses to drive the REAL stores. `log` goes through the real Logger so channels
 * register and the production sink pipeline runs; `emit` reduces a runtime event through DevStore. Scenarios
 * never touch React, Ink, or the variant switcher; data and layout are independent axes.
 */
export interface PreviewContext {
    readonly store: DevStore;
    log(channel: string, line: string, level?: PreviewLogLevel): void;
    emit(event: DevEvent): void;
    wait(ms: number): Promise<void>;
    // A method, not a property: scenarios poll it in loops, and a readonly property would be narrowed to a
    // constant by the type checker (it can't see the value flip on unmount).
    isAborted(): boolean;
}

export interface Scenario {
    readonly name: string;
    readonly description: string;
    run(ctx: PreviewContext): Promise<void>;
}
