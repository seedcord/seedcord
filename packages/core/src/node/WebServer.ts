import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { asError, isPortInUse } from '@seedcord/utils/internal';

import { answerPluginsOrInteractions } from '#src/answerPluginsOrInteractions';
import { InFlight } from '#src/lifecycle/InFlight';
import { ShutdownPhase } from '#src/lifecycle/phases';
import { requestPath } from '#src/requestPath';
import { DEFAULT_SERVER_PORT, INTERNAL_SERVER_ERROR, SERVICE_UNAVAILABLE } from '#src/webConstants';

import { answerHealth } from './answerHealth';
import { ClientFiles } from './ClientFiles';
import { DRAIN_TASK_TIMEOUT_MS, DRAIN_WINDOW_MS } from './Lifecycle/drainWindow';
import { toWebRequest, writeWebResponse } from './webBridge';

import type { HmrManager } from '#hmr/HmrManager';
import type { CoordinatedStartup } from '#src/lifecycle/CoordinatedStartup';
import type { PluginRegistry } from '#src/plugin/PluginRegistry';
import type { ShutdownTasks } from './Lifecycle/CoordinatedShutdown';
import type { ServerConfig } from '@seedcord/types';
import type { DevServer } from '@seedcord/types/internal';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

const DEFAULT_HEALTH_PATH = '/health';
// far above any interaction payload. it keeps a large POST from filling memory
const DEFAULT_BODY_LIMIT = 1_048_576;
const NOT_FOUND = 404;
const PAYLOAD_TOO_LARGE = 413;
const STOP_TIMEOUT_MS = 5000;

export interface WebServerOptions {
    readonly config: () => ServerConfig | undefined;
    readonly shutdown: ShutdownTasks;
    readonly startup: Pick<CoordinatedStartup, 'isReady' | 'hasBegun'>;
    readonly plugins: Pick<PluginRegistry, 'answer' | 'answersRequests'>;
    // http answers Discord's interactions here. a gateway bot takes them over its websocket
    readonly interactions: ((request: Request) => Promise<Response>) | undefined;
    // seedcord dev sets this before start()
    readonly dev: () => DevServer | undefined;
    readonly clientDir: string | undefined;
}

// answers a node bot's web requests: health, built client files, plugins, then interactions or a 404. serve() also puts it on a port
export class WebServer {
    private readonly logger = new Logger('Server', { channel: 'server' });
    private readonly inFlight = new InFlight(this.logger, 'Requests');
    private readonly clientFiles: ClientFiles | undefined;
    private server?: Server;
    private bound: number | undefined;

    constructor(private readonly options: WebServerOptions) {
        const { shutdown, clientDir } = options;
        this.clientFiles = this.clientFilesIn(clientDir);
        shutdown.addTask(ShutdownPhase.Unbind, 'close-web-server', () => this.close(), STOP_TIMEOUT_MS);
        shutdown.addTask(
            ShutdownPhase.Drain,
            'drain-requests',
            () => this.inFlight.drain(DRAIN_WINDOW_MS),
            DRAIN_TASK_TIMEOUT_MS
        );
    }

    public pauseDuringReloads(hmr: HmrManager): void {
        hmr.pauseDuringReloads(this.inFlight);
    }

    private get config(): ServerConfig {
        return this.options.config() ?? {};
    }

    private get healthPath(): string | undefined {
        const { health = DEFAULT_HEALTH_PATH } = this.config;
        return health === false ? undefined : health;
    }

    public async fetch(request: Request): Promise<Response> {
        const { startup } = this.options;
        if (!startup.hasBegun) throw new SeedcordError(SeedcordErrorCode.CoreFetchBeforeStart);

        // health answers before admit() so a check during startup gets its 503 right away
        const { healthPath } = this;
        const health = healthPath && answerHealth(request, healthPath, startup.isReady && !this.inFlight.closed);
        if (health) return health;

        const response = await this.inFlight.admit(() => this.respond(request));
        return response ?? new Response(null, { status: SERVICE_UNAVAILABLE });
    }

    // the same order as seedcord dev, where vite answers before the bot
    private async respond(request: Request): Promise<Response> {
        const { plugins, interactions } = this.options;
        return (
            (await this.clientFiles?.answer(request)) ??
            (await answerPluginsOrInteractions(request, plugins, interactions)) ??
            new Response(null, { status: NOT_FOUND })
        );
    }

    // ServerHost calls this when Ready begins, and requests that arrive earlier wait until then.
    // seedcord dev passes devHost for a quick tunnel
    public async serve(devHost: string | undefined): Promise<void> {
        this.inFlight.open();
        const { port = DEFAULT_SERVER_PORT, host } = this.config;
        if (port !== false && this.hasRoutes) await this.listen(port, devHost ?? host);
    }

    // the port it listens on, which differs from the config's port when that's 0
    public get port(): number | undefined {
        return this.bound;
    }

    // seedcord dev's core.url. before the server listens it uses the config's port, which is only wrong for 0
    public get localUrl(): string | undefined {
        const { port = DEFAULT_SERVER_PORT } = this.config;
        return port === false ? undefined : `http://localhost:${String(this.bound ?? port)}`;
    }

    private get hasRoutes(): boolean {
        const { interactions, plugins, dev } = this.options;
        return (
            this.healthPath !== undefined ||
            interactions !== undefined ||
            plugins.answersRequests ||
            this.clientFiles !== undefined ||
            dev() !== undefined
        );
    }

    // next.js and bun build --compile copy the bot's code into their own output without the pages folder
    private clientFilesIn(clientDir: string | undefined): ClientFiles | undefined {
        if (clientDir === undefined) return undefined;
        if (existsSync(clientDir)) return new ClientFiles(clientDir);
        this.logger.warn(
            `The bot can't serve its web pages because ${paint.path(clientDir)} doesn't exist beside it. Serve that folder from the host that runs your bot.`
        );
        return undefined;
    }

    private async listen(port: number, host: string | undefined): Promise<void> {
        const server = createServer((incoming, outgoing) => {
            this.answer(server, incoming, outgoing).catch((error: unknown) => {
                this.logger.error(
                    `Failed to answer ${incoming.method ?? 'GET'} ${requestPath(incoming.url ?? '/')}`,
                    error
                );
                // once a stream's status is out, closing the socket is the only way left to report a failure
                if (outgoing.headersSent) outgoing.destroy(asError(error));
                else outgoing.writeHead(INTERNAL_SERVER_ERROR).end();
            });
        });
        this.server = server;
        server.on('upgrade', (incoming, socket, head) => {
            if (!this.options.dev()?.upgrade(incoming, socket, head)) socket.destroy();
        });

        server.listen(port, host);
        try {
            await once(server, 'listening');
        } catch (error: unknown) {
            if (!isPortInUse(error)) throw error;
            throw new SeedcordError(SeedcordErrorCode.PortInUse, [port, 'server.port'], { cause: error });
        }
        // node throws process-wide on an 'error' that nothing listens for
        server.on('error', (error) => this.logger.error('Server error', error));

        // justified: address() is AddressInfo once a TCP server is listening
        this.bound = (server.address() as AddressInfo).port;
        // every interface includes localhost, and a browser can't open 0.0.0.0
        const url = `http://${host ?? 'localhost'}:${String(this.bound)}`;
        this.logger.info(`Server listening on ${paint.sky.bold(url)}`);
    }

    private async answer(server: Server, incoming: IncomingMessage, outgoing: ServerResponse): Promise<void> {
        if (await this.options.dev()?.serve(incoming, outgoing)) return;
        const request = await toWebRequest(incoming, this.config.bodyLimit ?? DEFAULT_BODY_LIMIT);
        const response = request ? await this.fetch(request) : new Response(null, { status: PAYLOAD_TOO_LARGE });
        await writeWebResponse(response, outgoing);
        // node's close() only closes the connections that are idle when you call it.
        // this one just went idle, like the connection of an SSE stream that dispose() closed
        if (!server.listening) server.closeIdleConnections();
    }

    // new requests get 503, and the port closes once the open connections finish
    public close(): Promise<void> {
        this.inFlight.close();
        const server = this.server;
        // close() on a server that isn't listening calls back with an error and never emits 'close'
        if (!server?.listening) return Promise.resolve();
        this.options.dev()?.closeSockets();

        return new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                this.logger.info(paint.coral.bold('Server stopped'));
                resolve();
            });
        });
    }
}
