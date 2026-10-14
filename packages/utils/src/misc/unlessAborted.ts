export function unlessAborted<ResultT>(work: Promise<ResultT>, signal: AbortSignal | undefined): Promise<ResultT> {
    if (!signal) return work;
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- abort() takes any value as its reason
        const stop = (): void => reject(signal.reason);
        if (signal.aborted) stop();
        signal.addEventListener('abort', stop, { once: true });
        void work.then(resolve, reject).finally(() => signal.removeEventListener('abort', stop));
    });
}
