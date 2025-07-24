/*
 * Inspired by Akka Coordinated Shutdown: https://doc.akka.io/libraries/akka-core/current/coordinated-shutdown.html
 * Original implementation by Lewis (https://github.com/Yomanz)
 *
 * Modified in 2025 by Dhruv Jain (https://github.com/materwelonDhruv)
 * Changes: streamlined flow, typed event keys, better logging, added toggle support
 */

import { EventEmitter } from 'node:events';

import chalk from 'chalk';

import { Logger } from './Logger';
import { Globals } from '../library/globals/Globals';

import type { TypedExclude, NumberRange } from '../library/types/Miscellaneous';

/**
 * Shutdown phases for coordinated application shutdown.
 * Phases execute in the order defined below.
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

type ShutdownAction = 'start' | 'complete' | 'error';
type PhaseAction = TypedExclude<ShutdownAction, 'error'>;
type ShutdownEvents = `shutdown:${ShutdownAction}`;
type PhaseEvents = `phase:${NumberRange<1, 5>}:${PhaseAction}`;
type CoordinatedShutdownEventKey = ShutdownEvents | PhaseEvents;

/** Interface for a shutdown task */
export interface ShutdownTask {
  name: string;
  task: () => Promise<void>;
  timeout: number; // timeout in milliseconds
}

/** Define the order of phases */
const PHASE_ORDER: ShutdownPhase[] = [
  ShutdownPhase.StopAcceptingRequests,
  ShutdownPhase.StopServices,
  ShutdownPhase.ExternalResources,
  ShutdownPhase.DiscordCleanup,
  ShutdownPhase.FinalCleanup
];

const LOG_FLUSH_DELAY_MS = 500;

export class CoordinatedShutdown {
  private static _instance: CoordinatedShutdown;

  private readonly logger = new Logger('CoordinatedShutdown');
  private readonly events = new EventEmitter();
  private readonly tasksMap = new Map<ShutdownPhase, ShutdownTask[]>();

  private isShuttingDown = false;
  private exitCode = 0;

  private constructor() {
    // Initialize phases
    PHASE_ORDER.forEach((phase) => this.tasksMap.set(phase, []));

    // Register signal handlers
    this.registerSignalHandlers();
  }

  public static get instance(): CoordinatedShutdown {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return (this._instance ??= new CoordinatedShutdown());
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
  public addTask(phase: ShutdownPhase, taskName: string, task: () => Promise<void>, timeoutMs = 5000): void {
    if (!Globals.shutdownIsEnabled) return;

    const tasks = this.tasksMap.get(phase);
    if (!tasks) throw new Error(`Unknown shutdown phase: ${phase}`);

    tasks.push({ name: taskName, task, timeout: timeoutMs });
    this.logger.info(
      `${chalk.italic('Added')} shutdown task ${chalk.bold.cyan(taskName)} to phase ${chalk.bold.magenta(phase)}`
    );
  }

  /**
   * Remove a task by name from a specific phase
   */
  public removeTask(phase: ShutdownPhase, taskName: string): boolean {
    const tasks = this.tasksMap.get(phase);
    if (!tasks) return false;

    const initialLength = tasks.length;
    const filteredTasks = tasks.filter((task) => task.name !== taskName);
    this.tasksMap.set(phase, filteredTasks);

    const removed = initialLength !== filteredTasks.length;
    if (removed) {
      this.logger.info(
        `${chalk.italic('Removed')} shutdown task ${chalk.bold.cyan(taskName)} from phase ${chalk.bold.magenta(phase)}`
      );
    }

    return removed;
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
      this.logger.error(`${chalk.bold.red('Coordinated shutdown failed')}:`, error);
      this.emit('shutdown:error', error);
    } finally {
      // Terminate the process
      this.logger.info(`${chalk.bold.red('Exiting')} process with code ${chalk.bold.cyan(this.exitCode)}`);
      // Small delay to allow logs to be flushed
      setTimeout(() => {
        process.exit(this.exitCode);
      }, LOG_FLUSH_DELAY_MS);
    }
  }

  /**
   * Run all tasks in a specific phase
   */
  private async runPhase(phase: ShutdownPhase): Promise<void> {
    const tasks = this.tasksMap.get(phase) ?? [];
    if (tasks.length === 0) {
      this.logger.warn(`No tasks to run in phase '${phase}'`);
      return;
    }

    this.logger.info(
      `${chalk.bold.yellow('Running')} shutdown phase ${chalk.bold.magenta(phase)} with ${chalk.bold.cyan(tasks.length)} tasks`
    );
    this.emit(`phase:${phase}:start`);

    // Execute all tasks in parallel with timeout
    const results = await Promise.allSettled(tasks.map((task) => this.runTaskWithTimeout(phase, task)));

    // Check results
    const failures = results.filter((r) => r.status === 'rejected').length;
    if (failures > 0) {
      this.logger.warn(`Phase ${chalk.bold.magenta(phase)} completed with ${chalk.bold.red(failures)} failed tasks`);
    } else {
      this.logger.info(`Phase ${chalk.bold.magenta(phase)} ${chalk.bold.green('completed successfully')}`);
    }

    this.emit(`phase:${phase}:complete`);
  }

  /**
   * Run a single task with timeout
   */
  private async runTaskWithTimeout(phase: ShutdownPhase, task: ShutdownTask): Promise<void> {
    this.logger.info(
      `${chalk.italic('Starting')} task ${chalk.bold.cyan(task.name)} in phase ${chalk.bold.magenta(phase)}`
    );

    try {
      // Create a race between the task and a timeout
      await Promise.race([
        task.task(),
        new Promise<void>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Task '${task.name}' timed out after ${task.timeout}ms`));
          }, task.timeout);
        })
      ]);

      this.logger.info(
        `${chalk.italic('Completed')} task ${chalk.bold.cyan(task.name)} in phase ${chalk.bold.magenta(phase)}`
      );
    } catch (error) {
      this.logger.error(
        `${chalk.italic('Failed')} task ${chalk.bold.cyan(task.name)} in phase ${chalk.bold.magenta(phase)}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Subscribe to shutdown events
   */
  public on(event: CoordinatedShutdownEventKey, listener: (...args: unknown[]) => void): void {
    this.events.on(event, listener);
  }

  /**
   * Unsubscribe from shutdown events
   */
  public off(event: CoordinatedShutdownEventKey, listener: (...args: unknown[]) => void): void {
    this.events.off(event, listener);
  }

  private emit(event: CoordinatedShutdownEventKey, ...args: unknown[]): boolean {
    return this.events.emit(event, ...args);
  }
}
