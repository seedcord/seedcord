import type { RunOutcome } from './TaskRunner';

export class TaskState {
    private readonly runs = new Set<Promise<RunOutcome>>();

    public get busy(): boolean {
        return this.runs.size > 0;
    }

    public add(run: Promise<RunOutcome>): void {
        this.runs.add(run);
        void run.finally(() => this.runs.delete(run));
    }

    public async settled(): Promise<void> {
        await Promise.allSettled(this.runs);
    }
}
