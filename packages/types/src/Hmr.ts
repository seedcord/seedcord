import type { LogRecord } from './Interfaces/LogSink';
import type { HmrUpdateEvent } from './Types/Hmr';

/**
 * An `Error` as JSON, for the dev channel between a bot in workerd and the CLI.
 *
 * @internal
 */
export interface WireError {
    name: string;
    message: string;
    stack?: string | undefined;
    code?: unknown;
}

/**
 * A {@link LogRecord} as JSON. Each arg carries either an `Error` or a JSON-safe value.
 *
 * @internal
 */
export interface WireLogRecord extends Omit<LogRecord, 'args'> {
    args?: ({ error: WireError } | { value: unknown })[] | undefined;
}

/**
 * HMR events the framework (client) sends to the CLI (server).
 *
 * @internal
 */
export interface SeedcordFrameworkEvents {
    'seedcord:register-critical-files': { patterns: string[] };
    'seedcord:commands-update-prompt': { files: string[] };
    'seedcord:server-listening': { port: number };
    'seedcord:started': { username: string | undefined };
    'seedcord:start-failed': { error: WireError };
    'seedcord:log': WireLogRecord;
}

/**
 * HMR events the CLI (server) sends to the framework (client).
 *
 * @internal
 */
export interface SeedcordCliEvents {
    'seedcord:hmr': HmrUpdateEvent;
    'seedcord:refresh-commands': { shouldRefresh: boolean };
    'seedcord:start': Record<string, never>;
}

/**
 * A typed dev channel over a raw vite hot object, carrying the framework and CLI HMR wire so neither
 * side needs the ambient `vite-hmr.d.ts` augmentation.
 *
 * @internal
 */
export interface DevChannel<TSend, TRecv> {
    send<Key extends keyof TSend & string>(event: Key, data: TSend[Key]): void;
    on<Key extends keyof TRecv & string>(event: Key, cb: (data: TRecv[Key]) => void): void;
}
