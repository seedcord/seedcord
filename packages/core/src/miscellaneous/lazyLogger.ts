import { Logger } from '@seedcord/logger';

import type { LoggerOptions } from '@seedcord/logger';

// lazy because env binds after the calling module loads
export function lazyLogger(label: string, options: LoggerOptions): () => Logger {
    let logger: Logger | undefined;
    return () => (logger ??= new Logger(label, options));
}
