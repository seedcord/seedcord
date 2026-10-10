import { Plugin } from '@seedcord/http';

export class PingCounter extends Plugin {
    private runs = 0;

    public init(): Promise<void> {
        return Promise.resolve();
    }

    public bump(): number {
        this.runs++;
        return this.runs;
    }
}
