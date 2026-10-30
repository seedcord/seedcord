export class KeyedQueue {
    private readonly tails = new Map<string, Promise<void>>();

    public run<TResult>(key: string, task: () => Promise<TResult>): Promise<TResult> {
        const run = (this.tails.get(key) ?? Promise.resolve()).then(task);
        const tail = run.then(
            () => undefined,
            () => undefined
        );
        this.tails.set(key, tail);
        void tail.then(() => {
            if (this.tails.get(key) === tail) this.tails.delete(key);
        });
        return run;
    }
}
