import { Plugin } from '@seedcord/http';

const MS_PER_SECOND = 1000;

export class Uptime extends Plugin {
    private startedAt = 0;

    public init(): Promise<void> {
        this.startedAt = Date.now();
        return Promise.resolve();
    }

    public sinceStart(): number {
        return Math.round((Date.now() - this.startedAt) / MS_PER_SECOND);
    }
}
