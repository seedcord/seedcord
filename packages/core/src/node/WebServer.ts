import { once } from 'node:events';
import { createServer } from 'node:http';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { asError, isPortInUse } from '@seedcord/utils/internal';

import { ShutdownPhase } from '#src/lifecycle/phases';

import { DRAIN_TASK_TIMEOUT_MS, DRAIN_WINDOW_MS } from './Lifecycle/drainWindow';
import { InFlight } from './Lifecycle/InFlight';
import { toWebRequest, writeWebResponse } from './webBridge';

import type { CoordinatedStartup } from '#src/lifecycle/CoordinatedStartup';
import type { PluginAnswer } from '#src/plugin/PluginRegistry';
import type { HealthResponder } from './HealthResponder';
import type { ShutdownTasks } from './Lifecycle/CoordinatedShutdown';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

// far above any interaction payload. it keeps a large POST from filling memory
const BODY_LIMIT = 1_048_576;
const PAYLOAD_TOO_LARGE = 413;
const SERVICE_UNAVAILABLE = 503;
const STOP_TIMEOUT_MS = 5000;

export interface ListenAddress {
    readonly port: number;
    readonly host: string | undefined;
}

export interface WebServerOptions {
    readonly shutdown: ShutdownTasks;
    readonly startup: Pick<CoordinatedStartup, 'isReady' | 'hasBegun'>;
    readonly health: HealthResponder | undefined;
    readonly plugins: PluginAnswer;
    // what the transport does with a request that every plugin passed on
    readonly tail: (request: Request) => Promise<Response>;
    // the config key a PortInUse error points at, like 'port'
    readonly portSetting: string;
}

// a node bot's web requests: health, then the plugins, then the transport's tail.
// fetch() answers on its own, and serve() can also put it on a port
export class WebServer {
    private readonly logger = new Logger('Server', { channel: 'server' });
    private readonly inFlight = new InFlight(this.logger, 'Requests');
    private server?: Server;

    constructor(private readonly options: WebServerOptions) {
        const { shutdown } = options;
        shutdown.addTask(ShutdownPhase.Unbind, 'close-web-server', () => this.close(), STOP_TIMEOUT_MS);
        shutdown.addTask(ShutdownPhase.Drain, 'drain-requests', () => this.drain(), DRAIN_TASK_TIMEOUT_MS);
    }

    public async fetch(request: Request): Promise<Response> {
        const { startup, health } = this.options;
        if (!startup.hasBegun) throw new SeedcordError(SeedcordErrorCode.CoreFetchBeforeStart);

        // a host's health check during startup gets its 503 at once because health answers before admit()
        const answered = health?.answer(request, startup.isReady && !this.inFlight.closed);
        if (answered) return answered;

        const response = await this.inFlight.admit(
            async () => (await this.options.plugins(request)) ?? this.options.tail(request)
        );
        return response ?? new Response(null, { status: SERVICE_UNAVAILABLE });
    }

    // http's engine calls this through requestScope for work that runs after the response
    public waitUntil(work: Promise<unknown>): void {
        this.inFlight.track(work);
    }

    // both transports call this when Ready begins, and requests that arrive earlier wait until then.
    // resolves with the bound port, which differs from address.port when that's 0
    public async serve(address: ListenAddress | undefined): Promise<number | undefined> {
        this.inFlight.open();
        return address && this.listen(address.port, address.host);
    }

    private async listen(port: number, host: string | undefined): Promise<number> {
        const server = createServer((incoming, outgoing) => {
            this.answer(server, incoming, outgoing).catch((error: unknown) => {
                this.logger.error(`Failed to answer ${incoming.method ?? 'GET'} ${incoming.url ?? '/'}`, error);
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
            throw new SeedcordError(SeedcordErrorCode.PortInUse, [port, this.options.portSetting], { cause: error });
        }

        // justified: address() is AddressInfo once a TCP server is listening
        const bound = (server.address() as AddressInfo).port;
        // every interface includes localhost, and a browser can't open 0.0.0.0
        const url = `http://${host ?? 'localhost'}:${String(bound)}`;
        this.logger.info(`Server listening on ${paint.sky.bold(url)}`);
        return bound;
    }

    private async answer(server: Server, incoming: IncomingMessage, outgoing: ServerResponse): Promise<void> {
        const request = await toWebRequest(incoming, BODY_LIMIT);
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

    private drain(): Promise<void> {
        return this.inFlight.drain(DRAIN_WINDOW_MS);
    }
}
