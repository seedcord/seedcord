import type { RunOutcome } from './TaskRunner';

/**
 * The run state of one task key. The runner keeps one per key and hands the same one to every
 * class that registers under it, so a save that reloads the task's file keeps it.
 */
export class TaskState {
    private readonly runs = new Set<Promise<RunOutcome>>();

    constructor(
        public protect: boolean,
        public paused: boolean
    ) {}

    public get busy(): boolean {
        return this.runs.size > 0;
    }

    public add(run: Promise<RunOutcome>): void {
        this.runs.add(run);
        void run.finally(() => this.runs.delete(run));
    }

    /** Resolves once every run in flight right now has ended. */
    public async settled(): Promise<void> {
        await Promise.allSettled(this.runs);
    }
}
