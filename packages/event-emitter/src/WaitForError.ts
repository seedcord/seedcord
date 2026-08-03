/** Rejection thrown when a {@link TypedEventEmitter.waitFor} is aborted or times out. */
export class WaitForError extends Error {
    public readonly reason: 'aborted' | 'timeout';

    constructor(reason: 'aborted' | 'timeout', timeoutMs?: number) {
        super(
            reason === 'timeout'
                ? `waitFor timed out after ${timeoutMs}ms.`
                : 'waitFor was aborted via its AbortSignal.'
        );
        this.name = 'WaitForError';
        this.reason = reason;
    }
}
