import type {
    HostAugmentTarget,
    HostContract,
    HostDevServer,
    HostDevUrl,
    HostListenHost,
    HostPlugins,
    HostShutdown,
    HostStartup,
    HostVersion
} from '#src/brand';
import type { Config } from './Config';
import type { REST } from '@discordjs/rest';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';

export type TransportPackage = '@seedcord/gateway' | '@seedcord/http';

// the parts of vite's dev server that a node bot's own web server hands requests to
export interface DevServer {
    // true when the bot has pages. under dev that gives it a port even without routes
    readonly servesPages: boolean;
    // false when vite passes the request on to the bot
    serve(request: IncomingMessage, response: ServerResponse): Promise<boolean>;
    // false when the socket isn't vite's
    upgrade(request: IncomingMessage, socket: Duplex, head: Buffer): boolean;
    // node's server.close() waits for every socket that upgrade() took, and a browser holds them open
    closeSockets(): void;
}

// Core implements this. the CLI narrows a loaded module export to it after the SeedcordBrand runtime check
export interface SeedcordInstance {
    readonly config: Config;
    readonly rest: REST; // the CLI copies its options for every request it makes to discord
    readonly username: string | undefined; // the bot's discord username, for the dev status. undefined before login

    // symbol keys keep these out of autocomplete on a host
    readonly [HostVersion]: string;
    readonly [HostContract]: number;
    readonly [HostAugmentTarget]: TransportPackage;
    readonly [HostPlugins]: {
        // the attach keys in attach order. codegen writes one Core row for each
        readonly keys: readonly string[];
        // every dispatch member, with the key of the plugin that adds it
        readonly members: readonly { readonly key: string; readonly member: string }[];
        prepareCommands(commands: readonly RESTPostAPIApplicationCommandsJSONBody[]): Promise<void>;
    };
    readonly [HostShutdown]: { run(exitCode?: number, exitProcess?: boolean): Promise<void> };
    readonly [HostStartup]: { abort(): void };
    // seedcord dev sets this before start() for a quick tunnel
    // the web server binds every address when unset
    [HostListenHost]?: string | undefined;
    // seedcord dev sets this before start() when `dev.tunnel` is a URL. core.url returns it while server.url is unset
    [HostDevUrl]?: string | undefined;
    // seedcord dev sets this before start() on a node bot
    [HostDevServer]?: DevServer | undefined;
    start(): Promise<unknown>;
}
