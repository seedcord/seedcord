async function settled(...tasks: Promise<unknown>[]): Promise<void> {
    await Promise.allSettled(tasks);
}

export class KeyedQueue {
    private readonly tails = new Map<string, Promise<void>>();
    private readonly runTails = new Map<string, Promise<void>>();

    public run<TResult>(key: string, task: () => Promise<TResult>): Promise<TResult> {
        const run = (this.tails.get(key) ?? Promise.resolve()).then(task);
        const tail = settled(run);
        this.track(this.tails, key, tail);
        this.track(this.runTails, key, tail);
        return run;
    }

    public read<TResult>(key: string, task: () => Promise<TResult>): Promise<TResult> {
        // skips other reads. waiting on them slows down a busy key on a networked backend
        const read = (this.runTails.get(key) ?? Promise.resolve()).then(task);
        // a later run() waits for this read to finish
        this.track(this.tails, key, settled(this.tails.get(key) ?? Promise.resolve(), read));
        return read;
    }

    private track(tails: Map<string, Promise<void>>, key: string, tail: Promise<void>): void {
        tails.set(key, tail);
        void tail.then(() => {
            if (tails.get(key) === tail) tails.delete(key);
        });
    }
}
