import type { DevEvent } from '@commands/dev/runtime/events';
import type { LogLevel } from '@seedcord/logger';
import type { DevStore } from '@ui/stores/DevStore';

export type PreviewLogLevel = LogLevel;

/**
 * The surface a scenario uses to drive the real stores. `log` goes through the real Logger so channels
 * register and the production sink pipeline runs. `emit` reduces a runtime event through DevStore. Scenarios
 * never touch React, Ink, or the variant switcher. Data and layout are independent axes.
 */
export interface PreviewContext {
    readonly store: DevStore;
    log(channel: string, line: string, level?: PreviewLogLevel): void;
    emit(event: DevEvent): void;
    wait(ms: number): Promise<void>;
    // isAborted is a method because scenarios poll it in loops. a readonly property would narrow to
    // its initial value, so it never reflects the flip on unmount
    isAborted(): boolean;
}

export interface Scenario {
    readonly name: string;
    readonly description: string;
    run(ctx: PreviewContext): Promise<void>;
}
