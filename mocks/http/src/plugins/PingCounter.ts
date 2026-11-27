import { Plugin, ShutdownPhase } from '@seedcord/http';

import type { CoreBase, DispatchOrigin } from '@seedcord/http';

const encoder = new TextEncoder();

export class PingCounter extends Plugin {
    public override readonly dispatchMembers = {
        askedIn: (origin: DispatchOrigin): string => origin.userLocale ?? 'unknown'
    };

    private runs = 0;
    private readonly pages = new Set<ReadableStreamDefaultController<Uint8Array>>();

    public constructor(host: CoreBase) {
        // every browser tab showing the page holds a connection to this bot.
        // we need to close them in dispose() first because the server's close()
        // waits for all of them
        super(host, { dispose: { phase: ShutdownPhase.Unbind } });
    }

    public init(): Promise<void> {
        return Promise.resolve();
    }

    public bump(): number {
        this.runs++;
        for (const page of this.pages) this.send(page);
        return this.runs;
    }

    public override fetch(request: Request): Response | undefined {
        if (new URL(request.url).pathname !== '/api/pings') return undefined;
        let opened: ReadableStreamDefaultController<Uint8Array>;
        const events = new ReadableStream<Uint8Array>({
            start: (page) => {
                opened = page;
                this.pages.add(page);
                this.send(page);
            },
            cancel: () => {
                this.pages.delete(opened);
            }
        });
        return new Response(events, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } });
    }

    // EventSource reconnects once its stream closes and reaches the plugin that replaced this one
    public override dispose(): void {
        for (const page of this.pages) page.close();
        this.pages.clear();
    }

    private send(page: ReadableStreamDefaultController<Uint8Array>): void {
        page.enqueue(encoder.encode(`data: ${String(this.runs)}\n\n`));
    }
}
