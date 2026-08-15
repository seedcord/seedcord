import { Logger } from '@seedcord/logger';

import type { DevStore } from '#ui/stores/DevStore';
import type { PreviewContext, PreviewLogLevel } from './scenarios/types';

interface AbortRef {
    aborted: boolean;
}

export function createPreviewContext(store: DevStore, abortRef: AbortRef): PreviewContext {
    const base = new Logger('Bot');
    const byChannel = new Map<string, Logger>();

    function loggerFor(channel: string): Logger {
        let logger = byChannel.get(channel);
        if (!logger) {
            logger = base.inChannel(channel);
            byChannel.set(channel, logger);
        }
        return logger;
    }

    return {
        store,
        log(channel: string, line: string, level: PreviewLogLevel = 'info'): void {
            loggerFor(channel)[level](line);
        },
        emit(event): void {
            store.apply(event);
        },
        async wait(ms: number): Promise<void> {
            if (abortRef.aborted) return;
            await new Promise<void>((resolve) => setTimeout(resolve, ms));
        },
        isAborted(): boolean {
            return abortRef.aborted;
        }
    };
}
