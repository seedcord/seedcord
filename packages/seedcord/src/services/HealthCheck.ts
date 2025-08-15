import { createServer } from 'http';

import chalk from 'chalk';

import { ShutdownPhase } from './Lifecycle/CoordinatedShutdown';
import { Logger } from './Logger';
import { Plugin } from '../interfaces/Plugin';
import { Globals } from '../library/Globals';

import type { Core } from '../interfaces/Core';
import type { IncomingMessage, Server, ServerResponse } from 'http';

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;

/**
 * HTTP health check service for monitoring bot status.
 *
 * Provides a simple HTTP endpoint that responds with JSON status
 * information, useful for container orchestration and monitoring.
 */
export class HealthCheck extends Plugin {
  public readonly logger = new Logger('HealthCheck');
  private readonly port: number = Globals.healthCheckPort;
  private readonly path: string = Globals.healthCheckPath;
  private server?: Server;

  constructor(private readonly core: Core) {
    super(core);
    // Register shutdown task
    this.core.shutdown.addTask(ShutdownPhase.StopServices, 'stop-healthcheck-server', async () => await this.stop());
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

      this.server.listen(this.port, () => {
        this.logger.info(
          `${chalk.green.bold('✓')} Health check server listening on ${chalk.cyan(`http://localhost:${this.port}${this.path}`)}`
        );
        resolve();
      });
    });
  }

  /**
   * Stops the health check server.
   *
   * @returns Promise that resolves when the server is closed
   */
  public stop(): Promise<void> {
    return new Promise((shutdownResolve) => {
      this.server?.close(() => {
        this.logger.info(chalk.bold.red('Health check server stopped'));
        shutdownResolve();
      });
    });
  }
}
