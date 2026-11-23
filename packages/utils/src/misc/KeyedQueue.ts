async function settled(...tasks: Promise<unknown>[]): Promise<void> {
    await Promise.allSettled(tasks);
}

export interface WriteWatch {
    // true when a write to the key is running or has finished since the watch began
    overlaps(key: string): boolean;
    stop(): void;
}

export class KeyedQueue {
    private readonly tails = new Map<string, Promise<void>>();
    private readonly runTails = new Map<string, Promise<void>>();
    private readonly watches = new Set<Set<string>>();

    // workers freezes a task once the request that started it has ended. the task's promise never
    // settles then, and every later task for its key waits forever. `keepOpen` gets each task so the
    // caller can hand it to `waitUntil`
    constructor(private readonly keepOpen: (task: Promise<void>) => void = () => undefined) {}

    public run<TResult>(key: string, task: () => Promise<TResult>): Promise<TResult> {
        const run = (this.tails.get(key) ?? Promise.resolve()).then(task);
        const tail = settled(run).then(() => {
            for (const finished of this.watches) finished.add(key);
        });
        this.track(this.tails, key, tail);
        this.track(this.runTails, key, tail);
        this.keepOpen(tail);
        return run;
    }

    public read<TResult>(key: string, task: () => Promise<TResult>): Promise<TResult> {
        // skips other reads. waiting on them slows down a busy key on a networked backend
        const read = (this.runTails.get(key) ?? Promise.resolve()).then(task);
        // a later run() waits for this read to finish
        const tail = settled(this.tails.get(key) ?? Promise.resolve(), read);
        this.track(this.tails, key, tail);
        this.keepOpen(tail);
        return read;
    }

    public watchWrites(): WriteWatch {
        const finished = new Set<string>();
        this.watches.add(finished);
        return {
            overlaps: (key) => this.runTails.has(key) || finished.has(key),
            stop: () => void this.watches.delete(finished)
        };
    }

    private track(tails: Map<string, Promise<void>>, key: string, tail: Promise<void>): void {
        tails.set(key, tail);
        void tail.then(() => {
            if (tails.get(key) === tail) tails.delete(key);
        });
    }
}
