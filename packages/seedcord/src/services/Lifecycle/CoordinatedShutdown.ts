import chalk from 'chalk';

import { CoordinatedLifecycle } from './CoordinatedLifecycle';
import { Globals } from '../../library/Globals';

import type { LifecycleTask, PhaseEvents, UnionToTuple } from '@seedcord/types';

/**
 * Shutdown phases for coordinated application shutdown.
 */
export enum ShutdownPhase {
  /** Stop accepting new requests/interactions */
  StopAcceptingRequests = 1,
  /** Stop background services (health checks, etc.) */
  StopServices,
  /** Disconnect from external resources (database, APIs) */
  ExternalResources,
  /** Disconnect from Discord */
  DiscordCleanup,
  /** Final cleanup tasks */
  FinalCleanup
}

/** Define the order of phases */
const PHASE_ORDER: ShutdownPhase[] = [
  ShutdownPhase.StopAcceptingRequests,
  ShutdownPhase.StopServices,
  ShutdownPhase.ExternalResources,
  ShutdownPhase.DiscordCleanup,
  ShutdownPhase.FinalCleanup
];

type CoordinatedShutdownEventKey = PhaseEvents<'shutdown', UnionToTuple<ShutdownPhase>>;

export interface ShutdownTask extends LifecycleTask {}

const LOG_FLUSH_DELAY_MS = 500;

export class CoordinatedShutdown extends CoordinatedLifecycle<ShutdownPhase> {
  private isShuttingDown = false;
  private exitCode = 0;

  public constructor() {
    super('CoordinatedShutdown', PHASE_ORDER, ShutdownPhase);

    // Register signal hooks
    this.registerSignalHandlers();
  }

  protected canAddTask(): boolean {
    return Globals.shutdownIsEnabled;
  }

  protected canRemoveTask(): boolean {
    return true;
  }

  protected getTaskType(): string {
    return 'shutdown';
  }

  protected async executeTasksInPhase(
    phase: ShutdownPhase,
    tasks: LifecycleTask[]
  ): Promise<PromiseSettledResult<void>[]> {
    // Execute all tasks in parallel (unlike startup which uses sequential)
    const results: PromiseSettledResult<void>[] = [];
    for (const task of tasks) {
      results.push(
        await Promise.resolve()
          .then(() => this.runTaskWithTimeout(phase, task))
          .then(
            () => ({ status: 'fulfilled', value: undefined }) satisfies PromiseSettledResult<void>,
            (reason) => ({ status: 'rejected', reason }) satisfies PromiseSettledResult<void>
          )
      );
    }
    return results;
  }

  private registerSignalHandlers(): void {
    if (!Globals.shutdownIsEnabled) return;

    process.on('SIGTERM', () => {
      this.logger.info(`Received ${chalk.yellow.bold('SIGTERM')} signal`);
      void this.run(0);
    });

    process.on('SIGINT', () => {
      this.logger.info(`Received ${chalk.yellow.bold('SIGINT')} signal`);
      void this.run(0);
    });
  }

  /**
   * Add a task to a specific shutdown phase
   */
  public override addTask(phase: ShutdownPhase, taskName: string, task: () => Promise<void>, timeoutMs = 5000): void {
    super.addTask(phase, taskName, task, timeoutMs);
  }

  /**
   * Remove a task by name from a specific phase
   */
  public override removeTask(phase: ShutdownPhase, taskName: string): boolean {
    return super.removeTask(phase, taskName);
  }

  /**
   * Start the coordinated shutdown sequence
   */
  public async run(exitCode = 0): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.warn('Shutdown sequence already in progress');
      return;
    }

    this.isShuttingDown = true;
    this.exitCode = exitCode;
    this.logger.info(
      `${chalk.bold.yellow('Starting')} coordinated shutdown with exit code ${chalk.bold.cyan(exitCode)}`
    );
    this.emit('shutdown:start');

    try {
      // Execute each phase in order
      for (const phase of PHASE_ORDER) {
        await this.runPhase(phase);
      }

      this.logger.info(`${chalk.bold.green('Coordinated shutdown completed')} successfully`);
      this.emit('shutdown:complete');
    } catch (error) {
      this.logger.error(`${chalk.bold.red('Coordinated shutdown failed')}`);
      this.emit('shutdown:error', error);
    } finally {
      this.logger.info(`${chalk.bold.red('Exiting')} process with code ${chalk.bold.cyan(this.exitCode)}`);
      setTimeout(() => {
        process.exit(this.exitCode);
      }, LOG_FLUSH_DELAY_MS);
    }
  }

  /**
   * Subscribe to shutdown events
   */
  public override on(event: CoordinatedShutdownEventKey, listener: (...args: unknown[]) => void): void {
    super.on(event, listener);
  }

  /**
   * Unsubscribe from shutdown events
   */
  public override off(event: CoordinatedShutdownEventKey, listener: (...args: unknown[]) => void): void {
    super.off(event, listener);
  }
}
