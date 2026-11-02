import { paint } from '@seedcord/errors';

import { runInteractionGates } from '#gates/runGates';
import { RepliableHandler } from '#src/handlers/RepliableHandler';
import { FaultBoundary } from '#src/notices/FaultBoundary';

import { outcomeFor, queuedMsFor, reportDispatch } from './dispatchReport';
import { resultFor, runAfter } from './runAfter';

import type { GateContextBase } from '#gates/Gate';
import type { CoreBase } from '#interfaces/CoreBase';
import type { MiddlewareKind } from '#src/metadataKeys';
import type { ApiErrorClass, FaultDetails, FaultSender } from '#src/notices/FaultBoundary';
import type { DispatchOutcome } from '#subscribers/types/Subscriptions';
import type { InteractionDispatch } from './DispatchContext';
import type { DispatchResult } from './dispatchResult';
import type { Logger } from '@seedcord/logger';
import type { Promisable } from 'type-fest';

interface RunnableHandler {
    execute(): Promisable<void>;
}

interface RunnableMiddleware extends RunnableHandler {
    after?(result: DispatchResult): Promisable<void>;
}

type Answer = (caught: unknown) => Promise<void>;

type Built<Instance> = new (...args: never[]) => Instance;

interface RepliableTarget {
    gateContext(): GateContextBase;
    newSender(): FaultSender;
}

// discord doesn't give autocomplete a reply target. @Gated rejects a gate on it at compile time.
interface AutocompleteTarget {
    clearChoices(): Promise<unknown>;
}

export interface InteractionRunConfig {
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
    readonly target: RepliableTarget | AutocompleteTarget;
    faultDetails(): FaultDetails;
}

export class InteractionRun {
    private readonly ran: RunnableMiddleware[] = [];
    private readonly startedAt = performance.now();
    private readonly queuedMs: number;
    private readonly boundary: FaultBoundary;

    constructor(private readonly config: InteractionRunConfig) {
        const { core, apiError, interactionId, dispatch } = config;
        this.queuedMs = queuedMsFor(interactionId);
        this.boundary = new FaultBoundary(core, core.config.errors?.ignoreApiCodes, apiError, dispatch, () =>
            config.faultDetails()
        );
    }

    // a null return means the run already answered a throw or a refusal
    public async prepare(): Promise<(() => Promise<void>) | null> {
        const { target } = this.config;
        return 'clearChoices' in target ? this.prepareAutocomplete(target) : this.prepareRepliable(target);
    }

    private async prepareAutocomplete(target: AutocompleteTarget): Promise<(() => Promise<void>) | null> {
        const answer: Answer = (caught) => this.boundary.answerWithEmptyChoices(caught, () => target.clearChoices());
        const handler = await this.builtHandler(answer);
        return handler && (() => this.start(handler, answer));
    }

    private async prepareRepliable(target: RepliableTarget): Promise<(() => Promise<void>) | null> {
        const handler = await this.builtHandler((caught) => this.boundary.answerWithReply(caught, target.newSender()));
        if (!handler) return null;

        // justified: instanceof widens the base's sender generic to any
        const sender = handler instanceof RepliableHandler ? (handler.sender as FaultSender) : target.newSender();
        const answer: Answer = (caught) => this.boundary.answerWithReply(caught, sender);
        const refusal = await this.refusal(target, sender);
        if (refusal) {
            await this.answered(answer, refusal.caught);
            await runAfter(this.ran, resultFor(refusal.caught), this.config.logger);
            return null;
        }
        return () => this.start(handler, answer);
    }

    private async builtHandler(answer: Answer): Promise<RunnableHandler | null> {
        const { HandlerCtor, event, core, dispatch, logger } = this.config;
        logger.trace(`Processing ${paint.sky.bold(dispatch.routeId)} with ${paint.mute(HandlerCtor.name)}`);
        try {
            // justified: each transport's route maps pair a kind with the class that takes its event
            return new HandlerCtor(event as never, core as never, dispatch as never);
        } catch (caught) {
            await this.answered(answer, caught);
            return null;
        }
    }

    private async refusal(target: RepliableTarget, sender: FaultSender): Promise<{ caught: unknown } | null> {
        try {
            await this.runMiddlewares(sender);
            await runInteractionGates(this.config.HandlerCtor, target.gateContext());
            return null;
        } catch (caught) {
            return { caught };
        }
    }

    private async runMiddlewares(sender: FaultSender): Promise<void> {
        const { middlewares, event, core, dispatch } = this.config;
        // justified: a repliable target means a MiddlewareKind
        for (const Middleware of middlewares.chainFor(dispatch.kind as MiddlewareKind)) {
            // justified: chainFor picked this kind. the event is the one the class declares.
            const middleware = new Middleware(event as never, core as never, dispatch as never, sender as never);
            // pushed before the await because a middleware that throws still gets its after()
            this.ran.push(middleware);
            await middleware.execute();
        }
    }

    private async start(handler: RunnableHandler, answer: Answer): Promise<void> {
        let result: DispatchResult = { outcome: 'handled' };
        try {
            await handler.execute();
            this.report('handled');
        } catch (caught) {
            result = resultFor(caught);
            await this.answered(answer, caught);
        } finally {
            await runAfter(this.ran, result, this.config.logger);
        }
    }

    private async answered(answer: Answer, caught: unknown): Promise<void> {
        await answer(caught);
        this.report(outcomeFor(caught));
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
