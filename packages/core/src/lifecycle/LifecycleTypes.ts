export interface LifecycleTask {
    name: string;
    task: (signal: AbortSignal) => Promise<void>;
    timeout: number; // milliseconds
}
