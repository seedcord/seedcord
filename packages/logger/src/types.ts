import type { LoggerChannelId } from '@seedcord/types';

/** Options for a {@link Logger} instance. */
export interface LoggerOptions {
    /** @defaultValue `'default'` */
    channel?: LoggerChannelId | undefined;
}
