import { createServer } from 'node:http';

import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';

import { ShutdownPhase } from '#src/lifecycle/phases';

import { HealthResponder } from './HealthResponder';

import type { CoordinatedShutdown } from './Lifecycle/CoordinatedShutdown';
import type { HealthCheckConfig, HealthCheckOption } from '@seedcord/types';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';

const HTTP_NOT_FOUND = 404;

const DEFAULT_HEALTH_CHECK_PORT = 6967;

export class HealthCheck {
    public readonly logger = new Logger('HealthCheck', { channel: 'health' });

    private readonly _port: number;
    private readonly _host: string | undefined;

    private readonly responder: HealthResponder;
    private server?: Server;

    constructor(shutdown: CoordinatedShutdown, options?: HealthCheckConfig) {
        this._port = options?.port ?? DEFAULT_HEALTH_CHECK_PORT;
        this._host = options?.host;
        this.responder = new HealthResponder(options?.path);

        shutdown.addTask(ShutdownPhase.Drain, 'stop-healthcheck-server', () => this.stop());
    }

    public get port(): number {
        return this._port;
    }

    public get host(): string | undefined {
        return this._host;
    }

    public get path(): string {
        return this.responder.path;
    }

    public static fromOption(shutdown: CoordinatedShutdown, option?: HealthCheckOption): HealthCheck | undefined {
        if (option === false) return undefined;
        return new HealthCheck(shutdown, typeof option === 'object' ? option : undefined);
    }

    public async init(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const server = createServer((req: IncomingMessage, res: ServerResponse) => {
                if (this.responder.tryRespond(req, res)) return;

                res.writeHead(HTTP_NOT_FOUND, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'not found' }));
            });
            this.server = server;

            const onListenError = (err: Error): void => reject(err);
            server.on('error', onListenError);

            server.once('listening', () => {
                // a late error would reject an already-settled promise, and node throws process-wide without a listener here
                server.removeListener('error', onListenError);
                server.on('error', (err) => this.logger.error('Health check server error', err));

                // binds all interfaces, so log an address a browser can open
                const address = this._host ?? 'localhost';
                this.logger.info(
                    `${paint.mint.bold('✔︎')} Health check server listening on ${paint.sky.bold(`http://${address}:${this._port}${this.path}`)}`
                );
                resolve();
            });

            if (this._host) {
                this.logger.debug(`Binding health check server to ${this._host}`);
                server.listen(this._port, this._host);
            } else {
                this.logger.debug('Binding health check server to all interfaces');
                server.listen(this._port);
            }
        });
    }

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
