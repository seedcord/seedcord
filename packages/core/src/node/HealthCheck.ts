import { createServer } from 'node:http';

import { Logger, paint } from '@seedcord/logger';

import { ShutdownPhase } from './Lifecycle/CoordinatedShutdown';

import type { CoordinatedShutdown } from './Lifecycle/CoordinatedShutdown';
import type { HealthCheckConfig, HealthCheckOption } from '@seedcord/types';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;

const DEFAULT_HEALTH_CHECK_PORT = 6967;
const DEFAULT_HEALTH_CHECK_PATH = '/health';

/**
 * HTTP server answering `GET` on the configured path with a JSON `{ status, timestamp }` body.
 */
export class HealthCheck {
    /** @internal */
    public readonly logger = new Logger('HealthCheck');

    public readonly port: number;
    public readonly path: string;
    public readonly host: string | undefined;

    private server?: Server;

    constructor(shutdown: CoordinatedShutdown, options?: HealthCheckConfig) {
        this.port = options?.port ?? DEFAULT_HEALTH_CHECK_PORT;
        this.path = options?.path ?? DEFAULT_HEALTH_CHECK_PATH;
        this.host = options?.host;

        shutdown.addTask(ShutdownPhase.StopServices, 'stop-healthcheck-server', () => this.stop());
    }

    /**
     * Resolves the config `healthCheck` option, `undefined` builds the defaults like `true`.
     */
    public static fromOption(shutdown: CoordinatedShutdown, option?: HealthCheckOption): HealthCheck | undefined {
        if (option === false) return undefined;
        return new HealthCheck(shutdown, typeof option === 'object' ? option : undefined);
    }

    /**
     * Starts the health check server.
     * @returns Promise that resolves when the server is listening
     * @internal
     */
    public async init(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const server = createServer((req: IncomingMessage, res: ServerResponse) => {
                if (req.method === 'GET' && req.url === this.path) {
                    res.writeHead(HTTP_OK, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
                } else {
                    res.writeHead(HTTP_NOT_FOUND, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'not found' }));
                }
            });
            this.server = server;

            const onListenError = (err: Error): void => reject(err);
            server.on('error', onListenError);

            server.once('listening', () => {
                // Swap the listen-time reject handler for a logging one: keeping it would reject an
                // already-settled promise on a late error, and removing it without a replacement
                // would crash the process on an unhandled 'error' event.
                server.removeListener('error', onListenError);
                server.on('error', (err) => this.logger.error('Health check server error', err));

                // the server binds all interfaces, the log shows an address a browser can open
                const address = this.host ?? 'localhost';
                this.logger.info(
                    `${paint.mint.bold('✓')} Health check server listening on ${paint.sky(`http://${address}:${this.port}${this.path}`)}`
                );
                resolve();
            });

            if (this.host) {
                this.logger.debug(`Binding health check server to ${this.host}`);
                server.listen(this.port, this.host);
            } else {
                this.logger.debug('Binding health check server to all interfaces');
                server.listen(this.port);
            }
        });
    }

    /**
     * Stops the health check server.
     * @internal
     */
    public stop(): Promise<void> {
        const server = this.server;
        // close() on a non-listening server invokes its callback with ERR_SERVER_NOT_RUNNING and
        // never fires 'close', so without this guard the promise would hang the shutdown phase.
        if (!server?.listening) return Promise.resolve();

        return new Promise((resolve, reject) => {
            // settle only in the callback, a 'close'-event resolve would swallow the callback's error
            server.close((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.logger.info(paint.coral.bold('Health check server stopped'));
                resolve();
            });
        });
    }
}
