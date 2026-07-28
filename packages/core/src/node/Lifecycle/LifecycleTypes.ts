export interface LifecycleTask {
    name: string;
    task: () => Promise<void>;
    timeout: number; // milliseconds
}
