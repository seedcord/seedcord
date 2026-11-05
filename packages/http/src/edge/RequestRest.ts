import { REST } from '@discordjs/rest';

import { requestScope } from '#src/requestScope';

import type { EngineContext } from '#src/requestScope';
import type { InternalRequest, RESTOptions, ResponseLike } from '@discordjs/rest';

class RequestClient extends REST {
    constructor(
        options: Partial<RESTOptions>,
        private readonly parent: REST
    ) {
        super(options);
    }

    public override emit(...args: Parameters<REST['emit']>): boolean {
        return this.parent.emit(...args);
    }

    public override listenerCount(...args: Parameters<REST['listenerCount']>): number {
        return this.parent.listenerCount(...args);
    }
}

// workers cancels a request that waits on a promise it made for another request to resolve. the queues and
// the global limit wait in @discordjs/rest both work that way, and the cancelled request never frees its place
export class RequestRest extends REST {
    private readonly clients = new WeakMap<EngineContext, REST>();
    // @discordjs/rest throws its own missing token error on an empty string
    private token = '';

    constructor(private readonly restOptions: Partial<RESTOptions>) {
        super(restOptions);
    }

    public override setToken(token: string): this {
        this.token = token;
        return super.setToken(token);
    }

    public override queueRequest(request: InternalRequest): Promise<ResponseLike> {
        // seedcord dev runs its startup outside any request
        const ctx = requestScope.getStore();
        if (!ctx) return this.newClient().queueRequest(request);

        let client = this.clients.get(ctx);
        if (!client) {
            client = this.newClient();
            this.clients.set(ctx, client);
        }
        return client.queueRequest(request);
    }

    private newClient(): REST {
        return new RequestClient(this.restOptions, this).setToken(this.token);
    }
}
