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

    public override fetch(request: Request): Response | undefined {
        if (new URL(request.url).pathname !== '/api/pings') return undefined;
        return Response.json({ runs: this.runs });
    }
}
