import { once } from 'node:events';
import { createServer } from 'node:http';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { asError, isPortInUse } from '@seedcord/utils/internal';

import { ShutdownPhase } from '#src/lifecycle/phases';
import { requestPath } from '#src/requestPath';
import { requestScope } from '#src/requestScope';
import { DEFAULT_SERVER_PORT } from '#src/webConstants';

import { answerHealth } from './answerHealth';
import { DRAIN_TASK_TIMEOUT_MS, DRAIN_WINDOW_MS } from './Lifecycle/drainWindow';
import { InFlight } from './Lifecycle/InFlight';
import { toWebRequest, writeWebResponse } from './webBridge';

import type { CoordinatedStartup } from '#src/lifecycle/CoordinatedStartup';
import type { PluginRegistry } from '#src/plugin/PluginRegistry';
import type { ShutdownTasks } from './Lifecycle/CoordinatedShutdown';
import type { ServerConfig } from '@seedcord/types';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

const DEFAULT_HEALTH_PATH = '/health';
// far above any interaction payload. it keeps a large POST from filling memory
const DEFAULT_BODY_LIMIT = 1_048_576;
const NOT_FOUND = 404;
const PAYLOAD_TOO_LARGE = 413;
const SERVICE_UNAVAILABLE = 503;
const STOP_TIMEOUT_MS = 5000;

export interface WebServerOptions {
    readonly config: () => ServerConfig | undefined;
    readonly shutdown: ShutdownTasks;
    readonly startup: Pick<CoordinatedStartup, 'isReady' | 'hasBegun'>;
    readonly plugins: Pick<PluginRegistry, 'answer' | 'answersRequests'>;
    // http answers Discord's interactions here. a gateway bot takes them over its websocket
    readonly interactions: ((request: Request) => Promise<Response>) | undefined;
}

// answers a node bot's web requests: health, plugins, then interactions or a 404. serve() also puts it on a port
export class WebServer {
    private readonly logger = new Logger('Server', { channel: 'server' });
    private readonly inFlight = new InFlight(this.logger, 'Requests');
    private server?: Server;
    private bound: number | undefined;

    constructor(private readonly options: WebServerOptions) {
        const { shutdown } = options;
        shutdown.addTask(ShutdownPhase.Unbind, 'close-web-server', () => this.close(), STOP_TIMEOUT_MS);
        shutdown.addTask(
            ShutdownPhase.Drain,
            'drain-requests',
            () => this.inFlight.drain(DRAIN_WINDOW_MS),
            DRAIN_TASK_TIMEOUT_MS
        );
    }

    private get config(): ServerConfig {
        return this.options.config() ?? {};
    }

    private get healthPath(): string | undefined {
        const { health = DEFAULT_HEALTH_PATH } = this.config;
        return health === false ? undefined : health;
    }

    public async fetch(request: Request): Promise<Response> {
        const { startup, plugins, interactions } = this.options;
        if (!startup.hasBegun) throw new SeedcordError(SeedcordErrorCode.CoreFetchBeforeStart);

        // health answers before admit() so a check during startup gets its 503 right away
        const { healthPath } = this;
        const health = healthPath && answerHealth(request, healthPath, startup.isReady && !this.inFlight.closed);
        if (health) return health;

        const response = await this.inFlight.admit(() =>
            requestScope.run(
                this,
                async () =>
                    (await plugins.answer(request)) ??
                    (interactions ? interactions(request) : new Response(null, { status: NOT_FOUND }))
            )
        );
        return response ?? new Response(null, { status: SERVICE_UNAVAILABLE });
    }

    // keepRequestOpenFor calls this
    public waitUntil(work: Promise<unknown>): void {
        this.inFlight.track(work);
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
        const { interactions, plugins } = this.options;
        return this.healthPath !== undefined || interactions !== undefined || plugins.answersRequests;
    }

    private async listen(port: number, host: string | undefined): Promise<void> {
        const server = createServer((incoming, outgoing) => {
            this.answer(server, incoming, outgoing).catch((error: unknown) => {
                this.logger.error(
                    `Failed to answer ${incoming.method ?? 'GET'} ${requestPath(incoming.url ?? '/')}`,
                    error
                );
                // a swallowed throw would hang the client without a cause
                outgoing.destroy(asError(error));
            });
        });
        this.server = server;

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
        const request = await toWebRequest(incoming, this.config.bodyLimit ?? DEFAULT_BODY_LIMIT);
        const response = request ? await this.fetch(request) : new Response(null, { status: PAYLOAD_TOO_LARGE });
        // node's close() doesn't close a busy connection once it becomes idle
        if (!server.listening) outgoing.setHeader('connection', 'close');
        await writeWebResponse(response, outgoing);
    }

    // new requests get 503, and the port closes once the open connections finish
    public close(): Promise<void> {
        this.inFlight.close();
        const server = this.server;
        // close() on a server that isn't listening calls back with an error and never emits 'close'
        if (!server?.listening) return Promise.resolve();

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
