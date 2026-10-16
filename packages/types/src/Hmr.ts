import type { HmrUpdateEvent } from './Types/Hmr';

// how a bot in workerd sends a thrown error to the CLI
export interface WireError {
    name: string;
    message: string;
    stack?: string | undefined;
    code?: unknown;
    cause?: WireError | undefined;
    errors?: WireError[] | undefined; // an AggregateError's members
}

/**
 * The last deploy of one application's commands, as a hash per command scope.
 *
 * @internal
 */
export interface DeployedHashes {
    applicationId: string;
    scopes: Record<string, string>; // keyed by guild id, or 'global'
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
    'seedcord:read-deployed': { applicationId: string };
    'seedcord:commands-deployed': DeployedHashes;
}

/**
 * HMR events the CLI (server) sends to the framework (client).
 *
 * @internal
 */
export interface SeedcordCliEvents {
    'seedcord:hmr': HmrUpdateEvent;
    'seedcord:refresh-commands': { shouldRefresh: boolean };
    // eslint-disable-next-line no-magic-numbers -- chalk's ColorSupportLevel for the CLI's terminal, copied to keep chalk out of types
    'seedcord:start': { colorLevel: 0 | 1 | 2 | 3 };
    'seedcord:last-deploy': { deployed: DeployedHashes | undefined };
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
    off<Key extends keyof TRecv & string>(event: Key, cb: (data: TRecv[Key]) => void): void;
}
