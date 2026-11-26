import type { HmrUpdateEvent } from './Types/Hmr';
import type { EmptyObject, NonEmptyTuple } from 'type-fest';

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

export interface BotImport {
    file: string;
    names: string[] | 'all'; // 'all' for import * or export *
}

export interface HmrSave extends HmrUpdateEvent {
    // the bot file's imports among affectedModules
    botImports?: NonEmptyTuple<string>;
}

// the bot sends these to the CLI
export interface SeedcordFrameworkEvents {
    'seedcord:register-critical-files': { patterns: string[] };
    'seedcord:commands-update-prompt': { files: string[] };
    'seedcord:server-port': { port: number | false };
    'seedcord:started': { username: string | undefined };
    'seedcord:start-failed': { error: WireError };
    'seedcord:read-deployed': { applicationId: string };
    'seedcord:commands-deployed': DeployedHashes;
    'seedcord:full-reload': EmptyObject;
    // sent once every plugin has started. from then on the CLI adds botImports to seedcord:hmr
    'seedcord:read-bot-imports': EmptyObject;
    // the bot's answer when it couldn't reload the plugins in botImports
    'seedcord:restart-required': { file: string };
}

// the CLI sends these back
export interface SeedcordCliEvents {
    'seedcord:hmr': HmrSave;
    'seedcord:bot-imports': { imports: BotImport[] };
    'seedcord:refresh-commands': { shouldRefresh: boolean };
    // core.url falls back to url when server.url is unset
    // eslint-disable-next-line no-magic-numbers -- chalk's ColorSupportLevel for the CLI's terminal, copied to keep chalk out of types
    'seedcord:start': { colorLevel: 0 | 1 | 2 | 3; url: string };
    'seedcord:last-deploy': { deployed: DeployedHashes | undefined };
    // vite sends this one, right before it reloads every module
    'vite:beforeFullReload': unknown;
}

// vite's hot object with typed events
export interface DevChannel<TSend, TRecv> {
    send<Key extends keyof TSend & string>(event: Key, data: TSend[Key]): void;
    on<Key extends keyof TRecv & string>(event: Key, cb: (data: TRecv[Key]) => void): void;
    off<Key extends keyof TRecv & string>(event: Key, cb: (data: TRecv[Key]) => void): void;
}
