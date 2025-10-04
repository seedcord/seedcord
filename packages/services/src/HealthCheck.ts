import { createServer } from 'http';

import chalk from 'chalk';
import { Envapt } from 'envapt';

import { CoordinatedShutdown, ShutdownPhase } from './Lifecycle/CoordinatedShutdown';
import { Logger } from './Logger';

import type { IncomingMessage, Server, ServerResponse } from 'http';

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;

/**
 * HTTP health check service for monitoring bot status.
 *
 * Provides a simple HTTP endpoint that responds with JSON status
 * information, useful for container orchestration and monitoring.
 */
export class HealthCheck {
  public readonly logger = new Logger('HealthCheck');

  @Envapt('HEALTH_CHECK_PORT', { fallback: 6956 })
  declare public readonly port: number;

  @Envapt('HEALTH_CHECK_PATH', { fallback: '/healthcheck' })
  declare public readonly path: string;

  @Envapt('HEALTH_CHECK_HOST')
  declare public readonly host: string | null;

  private server?: Server;

  constructor(shutdown: CoordinatedShutdown) {
    // Register shutdown task
    shutdown.addTask(ShutdownPhase.StopServices, 'stop-healthcheck-server', async () => await this.stop());
  }

  /**
   * Starts the health check server.
   * @returns Promise that resolves when the server is listening
   */
  public async init(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
        if (req.method === 'GET' && req.url === this.path) {
          res.writeHead(HTTP_OK, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
        } else {
          res.writeHead(HTTP_NOT_FOUND, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'not found' }));
        }
      });

      this.server.on('error', reject);
      this.server.once('listening', () => {
        const address = this.host ?? 'localhost';
        this.logger.info(
          `${chalk.green.bold('✓')} Health check server listening on ${chalk.cyan(`http://${address}:${this.port}${this.path}`)}`
        );
        resolve();
      });

      if (this.host) {
        this.logger.debug(`Binding health check server to ${this.host}`);
        this.server.listen(this.port, this.host);
      } else {
        this.logger.debug('Binding health check server to all interfaces');
        this.server.listen(this.port);
      }
    });
  }

  /**
   * Stops the health check server.
   *
   * @returns Promise that resolves when the server is closed
   */
  public stop(): Promise<void> {
    if (this.server !== undefined) {
      const server = this.server;
      return new Promise((resolve) => {
        server.once('close', () => resolve());

        server.close(() => {
          this.logger.info(chalk.bold.red('Health check server stopped'));
        });
      });
    }

    return Promise.resolve();
  }
}
