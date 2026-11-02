import { paint } from '@seedcord/errors';

import { runInteractionGates } from '#gates/runGates';
import { RepliableHandler } from '#src/handlers/RepliableHandler';
import { InteractionKind } from '#src/metadataKeys';
import { FaultBoundary } from '#src/notices/FaultBoundary';

import { outcomeFor, queuedMsFor, reportDispatch } from './dispatchReport';
import { resultFor, runAfter } from './runAfter';

import type { GateContextBase } from '#gates/Gate';
import type { CoreBase } from '#interfaces/CoreBase';
import type { MiddlewareKind } from '#src/metadataKeys';
import type { ApiErrorClass, FaultTarget } from '#src/notices/FaultBoundary';
import type { FaultDetails } from '#src/notices/reportFault';
import type { DispatchOutcome } from '#subscribers/types/Subscriptions';
import type { InteractionDispatch } from './DispatchContext';
import type { DispatchResult } from './dispatchResult';
import type { Logger } from '@seedcord/logger';
import type { ReplyResponse } from '@seedcord/types';
import type { Promisable } from 'type-fest';

interface RunnableHandler {
    execute(): Promisable<void>;
}

interface RunnableMiddleware extends RunnableHandler {
    after?(result: DispatchResult): Promisable<void>;
}

interface FaultSender {
    send(response: ReplyResponse, options: { ephemeral: boolean }): Promise<unknown>;
}

type Built<Instance> = new (...args: never[]) => Instance;

export interface InteractionRunConfig<Sender extends FaultSender> {
    readonly dispatch: InteractionDispatch;
    readonly core: CoreBase;
    readonly event: unknown;
    readonly HandlerCtor: Built<RunnableHandler>;
    readonly middlewares: { chainFor(kind: MiddlewareKind): readonly Built<RunnableMiddleware>[] };
    readonly apiError: ApiErrorClass;
    readonly logger: Logger;
    readonly interactionId: string;
    readonly userId: string;
    readonly guildId: string | null;
    gateContext(): GateContextBase;
    faultDetails(): FaultDetails;
    newSender(): Sender;
    clearChoices(): Promise<unknown>;
}

export class InteractionRun<Sender extends FaultSender> {
    private readonly ran: RunnableMiddleware[] = [];
    private readonly startedAt = performance.now();
    private readonly queuedMs: number;
    private readonly boundary: FaultBoundary;
    // discord doesn't give autocomplete a reply target. @Gated rejects it at compile time.
    private readonly repliableKind: MiddlewareKind | null;

    constructor(private readonly config: InteractionRunConfig<Sender>) {
        const { core, dispatch, apiError, interactionId } = config;
        this.queuedMs = queuedMsFor(interactionId);
        this.boundary = new FaultBoundary(core, core.config.errors?.ignoreApiCodes, apiError);
        this.repliableKind = dispatch.kind === InteractionKind.Autocomplete ? null : dispatch.kind;
    }

    // a null return means the run already answered a throw or a refusal
    public async prepare(): Promise<(() => Promise<void>) | null> {
        let handler: RunnableHandler;
        try {
            handler = this.buildHandler();
        } catch (caught) {
            await this.answer(caught, undefined);
            return null;
        }

        // justified: each transport's handlers carry that transport's sender
        const sender = handler instanceof RepliableHandler ? (handler.sender as Sender) : undefined;
        const refusal = await this.refusal(sender);
        if (refusal) {
            await this.answer(refusal.caught, sender);
            await runAfter(this.ran, resultFor(refusal.caught), this.config.logger);
            return null;
        }
        return () => this.start(handler, sender);
    }

    private buildHandler(): RunnableHandler {
        const { HandlerCtor, event, core, dispatch, logger } = this.config;
        logger.trace(`Processing ${paint.sky.bold(dispatch.routeId)} with ${paint.mute(HandlerCtor.name)}`);
        // justified: each transport's route maps pair a kind with the class that takes its event
        return new HandlerCtor(event as never, core as never, dispatch as never);
    }

    private async refusal(sender: Sender | undefined): Promise<{ caught: unknown } | null> {
        if (!this.repliableKind || !sender) return null;
        try {
            await this.runMiddlewares(this.repliableKind, sender);
            await runInteractionGates(this.config.HandlerCtor, this.config.gateContext());
            return null;
        } catch (caught) {
            return { caught };
        }
    }

    private async runMiddlewares(kind: MiddlewareKind, sender: Sender): Promise<void> {
        const { middlewares, event, core, dispatch } = this.config;
        for (const Middleware of middlewares.chainFor(kind)) {
            // justified: chainFor picked this kind. the event is the one the class declares.
            const middleware = new Middleware(event as never, core as never, dispatch as never, sender as never);
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
            await runAfter(this.ran, result, this.config.logger);
        }
    }

    private async answer(caught: unknown, sender: Sender | undefined): Promise<void> {
        await this.boundary.answer(caught, () => this.config.faultDetails(), this.faultTarget(sender));
        this.report(outcomeFor(caught));
    }

    private faultTarget(sender: Sender | undefined): FaultTarget {
        if (!this.repliableKind) return { clearChoices: () => this.config.clearChoices() };
        return { reply: (response, options) => (sender ?? this.config.newSender()).send(response, options) };
    }

    private report(outcome: DispatchOutcome): void {
        const { core, dispatch, interactionId, userId, guildId } = this.config;
        reportDispatch(core.bus, {
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
