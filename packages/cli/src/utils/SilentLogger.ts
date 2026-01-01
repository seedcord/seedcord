import type { ILogger } from '@seedcord/types';

export class SilentLogger implements ILogger {
    public error(): void {}
    public warn(): void {}
    public info(): void {}
    public http(): void {}
    public verbose(): void {}
    public debug(): void {}
    public silly(): void {}
}
