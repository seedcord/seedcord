import { InteractionKind } from '#src/metadataKeys';

import { outcomeFor, queuedMsFor, reportDispatch } from './dispatchReport';
import { resultFor, runAfter } from './runAfter';

import type { MiddlewareKind } from '#src/metadataKeys';
import type { Bus } from '#subscribers/Bus';
import type { DispatchOutcome } from '#subscribers/types/Subscriptions';
import type { DispatchContext } from './DispatchContext';
import type { DispatchResult } from './dispatchResult';
import type { Logger } from '@seedcord/logger';
import type { Promisable } from 'type-fest';

interface RunnableHandler {
    execute(): Promisable<void>;
}

interface RunnableMiddleware extends RunnableHandler {
    after?(result: DispatchResult): Promisable<void>;
}

// what differs between the transports for one interaction
export interface InteractionRunAdapter<Sender> {
    readonly dispatch: DispatchContext<InteractionKind>;
    readonly bus: Bus;
    readonly logger: Logger;
    readonly interactionId: string;
    readonly userId: string;
    readonly guildId: string | null;
    buildHandler(): RunnableHandler;
    senderOf(handler: RunnableHandler): Sender | undefined;
    middlewares(kind: MiddlewareKind, sender: Sender): Iterable<RunnableMiddleware>;
    runGates(): Promise<void>;
    answer(caught: unknown, sender: Sender | undefined): Promise<void>;
}

export class InteractionRun<Sender> {
    private readonly ran: RunnableMiddleware[] = [];
    private readonly startedAt = performance.now();
    private readonly queuedMs: number;

    constructor(private readonly adapter: InteractionRunAdapter<Sender>) {
        this.queuedMs = queuedMsFor(adapter.interactionId);
    }

    // a null return means the run already answered a throw or a refusal
    public async prepare(): Promise<(() => Promise<void>) | null> {
        let handler: RunnableHandler;
        try {
            handler = this.adapter.buildHandler();
        } catch (caught) {
            await this.answer(caught, undefined);
            return null;
        }

        const sender = this.adapter.senderOf(handler);
        const refusal = await this.refusal(sender);
        if (refusal) {
            await this.answer(refusal.caught, sender);
            await runAfter(this.ran, resultFor(refusal.caught), this.adapter.logger);
            return null;
        }
        return () => this.start(handler, sender);
    }

    // discord doesn't give autocomplete a reply target. @Gated rejects it at compile time.
    private async refusal(sender: Sender | undefined): Promise<{ caught: unknown } | null> {
        const { kind } = this.adapter.dispatch;
        if (kind === InteractionKind.Autocomplete) return null;
        try {
            if (sender) await this.runMiddlewares(kind, sender);
            await this.adapter.runGates();
            return null;
        } catch (caught) {
            return { caught };
        }
    }

    private async runMiddlewares(kind: MiddlewareKind, sender: Sender): Promise<void> {
        for (const middleware of this.adapter.middlewares(kind, sender)) {
            // pushed before the await because a middleware that throws still gets its after()
            this.ran.push(middleware);
            await middleware.execute();
        }
    }

    private async start(handler: RunnableHandler, sender: Sender | undefined): Promise<void> {
        let result: DispatchResult = { outcome: 'handled' };
        try {
            await handler.execute();
            this.report('handled');
        } catch (caught) {
            result = resultFor(caught);
            await this.answer(caught, sender);
        } finally {
            await runAfter(this.ran, result, this.adapter.logger);
        }
    }

    private async answer(caught: unknown, sender: Sender | undefined): Promise<void> {
        await this.adapter.answer(caught, sender);
        this.report(outcomeFor(caught));
    }

    private report(outcome: DispatchOutcome): void {
        const { bus, dispatch, interactionId, userId, guildId } = this.adapter;
        reportDispatch(bus, {
            dispatch,
            interactionId,
            outcome,
            userId,
            guildId,
            startedAt: this.startedAt,
            queuedMs: this.queuedMs
        });
    }
}
