import chalk from 'chalk';

import { CoordinatedLifecycle } from './CoordinatedLifecycle';

import type { LifecycleTask, PhaseEvents, UnionToTuple } from '@seedcord/types';

/**
 * Startup phases for coordinated plugin initialization.
 */
export enum StartupPhase {
  /** Validate environment variables and config files */
  Validation = 1,
  /** Discover plugin constructors via decorators or registry */
  Discovery,
  /** Register plugin metadata and declared dependencies */
  Registration,
  /** Inject and validate plugin-specific configuration */
  Configuration,
  /** Instantiate plugin classes with Core and arguments */
  Instantiation,
  /** Activate plugins by calling their init/setup hooks */
  Activation,
  /** Mark seedcord as ready and start handling interactions */
  Ready
}

/** Define the order of phases */
const PHASE_ORDER: StartupPhase[] = [
  StartupPhase.Validation,
  StartupPhase.Discovery,
  StartupPhase.Registration,
  StartupPhase.Configuration,
  StartupPhase.Instantiation,
  StartupPhase.Activation,
  StartupPhase.Ready
];

type CoordinatedStartupEventKey = PhaseEvents<'startup', UnionToTuple<StartupPhase>>;

export interface StartupTask extends LifecycleTask {}

export class CoordinatedStartup extends CoordinatedLifecycle<StartupPhase> {
  private isStartingUp = false;
  private hasStarted = false;

  public constructor() {
    super('CoordinatedStartup', PHASE_ORDER, StartupPhase);
  }

  /**
   * Add a task to a specific startup phase
   */
  public override addTask(phase: StartupPhase, taskName: string, task: () => Promise<void>, timeoutMs = 10000): void {
    super.addTask(phase, taskName, task, timeoutMs);
  }

  protected canAddTask(): boolean {
    if (this.hasStarted) {
      throw new Error('Cannot add tasks after startup sequence has already completed');
    }

    if (this.isStartingUp) {
      throw new Error('Cannot add tasks while startup sequence is in progress');
    }

    return true;
  }

  protected canRemoveTask(): boolean {
    if (this.isStartingUp) {
      throw new Error('Cannot remove tasks while startup sequence is in progress');
    }

    return true;
  }

  protected getTaskType(): string {
    return 'startup';
  }

  protected async executeTasksInPhase(
    phase: StartupPhase,
    tasks: LifecycleTask[]
  ): Promise<PromiseSettledResult<void>[]> {
    // Execute all tasks in sequence
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

  /**
   * Start the coordinated startup sequence
   */
  public async run(): Promise<void> {
    if (this.hasStarted) {
      this.logger.warn('Startup sequence has already completed');
      return;
    }

    if (this.isStartingUp) {
      this.logger.warn('Startup sequence already in progress');
      return;
    }

    this.isStartingUp = true;
    this.logger.info(`${chalk.bold.green('Starting')} coordinated startup sequence`);
    this.emit('startup:start');

    try {
      // Execute each phase in order
      for (const phase of PHASE_ORDER) await this.runPhase(phase);

      this.hasStarted = true;
      this.logger.info(`${chalk.bold.green('Coordinated startup completed')} successfully`);
      this.emit('startup:complete');
    } catch (error) {
      this.logger.error(`${chalk.bold.red('Coordinated startup failed')}`);
      this.emit('startup:error', error);
      throw error;
    } finally {
      this.isStartingUp = false;
    }
  }

  /**
   * Subscribe to startup events
   */
  public override on(event: CoordinatedStartupEventKey, listener: (...args: unknown[]) => void): void {
    super.on(event, listener);
  }

  /**
   * Unsubscribe from startup events
   */
  public override off(event: CoordinatedStartupEventKey, listener: (...args: unknown[]) => void): void {
    super.off(event, listener);
  }

  /**
   * Check if startup has completed
   */
  public get isReady(): boolean {
    return this.hasStarted;
  }

  /**
   * Check if startup is currently running
   */
  public get isRunning(): boolean {
    return this.isStartingUp;
  }
}
