import { paint } from '@seedcord/errors';

import { runInteractionGates } from '#gates/runGates';
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
import type { Constructor, Promisable } from 'type-fest';

interface RunnableHandler {
    execute(): Promisable<void>;
}

interface RunnableMiddleware extends RunnableHandler {
    after?(result: DispatchResult): Promisable<void>;
}

type Answer = (caught: unknown) => Promise<void>;

// null when the run has already answered a throw or a refusal
type PreparedRun = (() => Promise<void>) | null;

interface RepliableTarget {
    readonly sender: FaultSender;
    gateContext(): GateContextBase;
}

// discord doesn't give autocomplete a reply target
interface AutocompleteTarget {
    readonly responder: { clear(): Promise<void> };
}

export interface InteractionRunConfig {
    readonly dispatch: InteractionDispatch;
    readonly core: CoreBase;
    readonly event: unknown;
    readonly customId: string | null;
    readonly HandlerCtor: Constructor<RunnableHandler, never[]>;
    readonly middlewares: { chainFor(kind: MiddlewareKind): readonly Constructor<RunnableMiddleware, never[]>[] };
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

    public async prepare(): Promise<PreparedRun> {
        const { target } = this.config;
        this.warnIfUnhandled();
        return 'responder' in target ? this.prepareAutocomplete(target) : this.prepareRepliable(target);
    }

    private warnIfUnhandled(): void {
        const { dispatch, customId, HandlerCtor, logger } = this.config;
        if (!dispatch.fallback) return;
        // an empty route means seedcord didn't make the interaction's custom ID
        if (dispatch.route === '') {
            logger.warn(`${paint.sky.bold(dispatch.kind)} has invalid customId: ${paint.mute(String(customId))}`);
            return;
        }
        logger.warn(`No handler found for ${paint.sky.bold(dispatch.routeId)}. Falling back to ${HandlerCtor.name}.`);
    }

    private async prepareAutocomplete({ responder }: AutocompleteTarget): Promise<PreparedRun> {
        const answer: Answer = (caught) => this.boundary.answerWithEmptyChoices(caught, () => responder.clear());
        const handler = await this.builtHandler(responder, answer);
        return handler && (() => this.start(handler, answer));
    }

    private async prepareRepliable(target: RepliableTarget): Promise<PreparedRun> {
        const { sender } = target;
        const answer: Answer = (caught) => this.boundary.answerWithReply(caught, sender);
        const handler = await this.builtHandler(sender, answer);
        if (!handler) return null;

        const refusal = await this.refusal(target);
        if (refusal) {
            await this.finish(answer, refusal.caught);
            return null;
        }
        return () => this.start(handler, answer);
    }

    private async builtHandler(replyWith: unknown, answer: Answer): Promise<RunnableHandler | null> {
        const { HandlerCtor, event, core, dispatch, logger } = this.config;
        logger.trace(`Processing ${paint.sky.bold(dispatch.routeId)} with ${paint.mute(HandlerCtor.name)}`);
        try {
            // justified: each transport's route maps pair a kind with the class that takes its event
            return new HandlerCtor(event as never, core as never, dispatch as never, replyWith as never);
        } catch (caught) {
            await this.finish(answer, caught);
            return null;
        }
    }

    private async refusal(target: RepliableTarget): Promise<{ caught: unknown } | null> {
        try {
            await this.runMiddlewares(target.sender);
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
            // justified: chainFor picked this kind. the class declares this event type.
            const middleware = new Middleware(event as never, core as never, dispatch as never, sender as never);
            // pushed before the await because a middleware that throws still gets its after()
            this.ran.push(middleware);
            await middleware.execute();
        }
    }

    private async start(handler: RunnableHandler, answer: Answer): Promise<void> {
        try {
            await handler.execute();
        } catch (caught) {
            await this.finish(answer, caught);
            return;
        }
        this.report('handled');
        await runAfter(this.ran, { outcome: 'handled' }, this.config.logger);
    }

    private async finish(answer: Answer, caught: unknown): Promise<void> {
        try {
            await answer(caught);
        } finally {
            this.report(outcomeFor(caught));
            await runAfter(this.ran, resultFor(caught), this.config.logger);
        }
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
