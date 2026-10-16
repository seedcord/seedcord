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

export interface DeployedHashes {
    applicationId: string;
    scopes: Record<string, string>; // keyed by guild id, or 'global'
}

// the bot sends these to the CLI
export interface SeedcordFrameworkEvents {
    'seedcord:register-critical-files': { patterns: string[] };
    'seedcord:commands-update-prompt': { files: string[] };
    'seedcord:server-listening': { port: number };
    'seedcord:started': { username: string | undefined };
    'seedcord:start-failed': { error: WireError };
    'seedcord:read-deployed': { applicationId: string };
    'seedcord:commands-deployed': DeployedHashes;
}

// the CLI sends these back
export interface SeedcordCliEvents {
    'seedcord:hmr': HmrUpdateEvent;
    'seedcord:refresh-commands': { shouldRefresh: boolean };
    // eslint-disable-next-line no-magic-numbers -- chalk's ColorSupportLevel for the CLI's terminal, copied to keep chalk out of types
    'seedcord:start': { colorLevel: 0 | 1 | 2 | 3 };
    'seedcord:last-deploy': { deployed: DeployedHashes | undefined };
}

// vite's hot object with typed events
export interface DevChannel<TSend, TRecv> {
    send<Key extends keyof TSend & string>(event: Key, data: TSend[Key]): void;
    on<Key extends keyof TRecv & string>(event: Key, cb: (data: TRecv[Key]) => void): void;
    off<Key extends keyof TRecv & string>(event: Key, cb: (data: TRecv[Key]) => void): void;
}
