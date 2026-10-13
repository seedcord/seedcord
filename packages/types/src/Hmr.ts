import type { LogRecord } from './Interfaces/LogSink';
import type { HmrUpdateEvent } from './Types/Hmr';

// vite's dev channel carries JSON between a bot in workerd and the CLI
export interface WireError {
    name: string;
    message: string;
    stack?: string | undefined;
    code?: unknown;
    cause?: WireError | undefined;
}

// each arg is either an Error or a JSON-safe value
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
    // chalk's level for the CLI's terminal, 0 for no color up to 3 for truecolor
    // eslint-disable-next-line no-magic-numbers -- chalk's ColorSupportLevel, copied here to keep chalk out of types
    'seedcord:start': { colorLevel: 0 | 1 | 2 | 3 };
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
