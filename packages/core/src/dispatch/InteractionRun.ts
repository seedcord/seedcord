import { paint } from '@seedcord/errors';
import { HostPlugins } from '@seedcord/types/internal';

import { runInteractionGates } from '#gates/runGates';
import { FaultBoundary } from '#src/notices/FaultBoundary';

import { outcomeFor, queuedMsFor, reportDispatch } from './dispatchReport';
import { resultFor, runAfter } from './runAfter';

import type { GateContextBase } from '#gates/Gate';
import type { CoreBase } from '#interfaces/CoreBase';
import type { ApiErrorClass, FaultDetails, FaultSender } from '#src/notices/FaultBoundary';
import type { DispatchOutcome } from '#subscribers/types/Subscriptions';
import type { InteractionDispatch } from './DispatchContext';
import type { DispatchOrigin } from './DispatchOrigin';
import type { DispatchResult } from './dispatchResult';
import type { Logger } from '@seedcord/logger';
import type { Promisable, SetNonNullable } from 'type-fest';

interface RunnableHandler {
    execute(): Promisable<void>;
}

interface RunnableMiddleware extends RunnableHandler {
    after?(result: DispatchResult): Promisable<void>;
}

type Answer = (caught: unknown) => Promise<void>;

// null when the run has already answered a throw or a refusal
type PreparedRun = (() => Promise<void>) | null;

// the transport builds these where the event and the class still have their kind's types
interface RepliableTarget {
    readonly sender: FaultSender;
    gateContext(): GateContextBase;
    handler(): RunnableHandler;
    readonly middlewares: readonly (() => RunnableMiddleware)[];
}

// discord doesn't give autocomplete a reply target
interface AutocompleteTarget {
    readonly responder: { clear(): Promise<void> };
    handler(): RunnableHandler;
}

export interface InteractionRunConfig {
    readonly dispatch: InteractionDispatch;
    readonly core: CoreBase;
    readonly customId: string | null;
    readonly HandlerCtor: { readonly name: string };
    readonly apiError: ApiErrorClass;
    readonly logger: Logger;
    readonly interactionId: string;
    readonly origin: SetNonNullable<DispatchOrigin, 'userId'>;
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

    private async prepareAutocomplete(target: AutocompleteTarget): Promise<PreparedRun> {
        const answer: Answer = (caught) => this.boundary.answerWithEmptyChoices(caught, () => target.responder.clear());
        const handler = await this.builtHandler(target, answer);
        return handler && (() => this.start(handler, answer));
    }

    private async prepareRepliable(target: RepliableTarget): Promise<PreparedRun> {
        const answer: Answer = (caught) => this.boundary.answerWithReply(caught, target.sender);
        const handler = await this.builtHandler(target, answer);
        if (!handler) return null;

        const refusal = await this.refusal(target);
        if (refusal) {
            await this.finish(answer, refusal.caught);
            return null;
        }
        return () => this.start(handler, answer);
    }

    private async builtHandler(
        target: { handler(): RunnableHandler },
        answer: Answer
    ): Promise<RunnableHandler | null> {
        const { HandlerCtor, core, dispatch, logger, origin } = this.config;
        logger.trace(`Processing ${paint.sky.bold(dispatch.routeId)} with ${paint.mute(HandlerCtor.name)}`);
        try {
            await core[HostPlugins].buildMembers(dispatch, origin);
            return core[HostPlugins].assertMembersKept(target.handler(), dispatch);
        } catch (caught) {
            await this.finish(answer, caught);
            return null;
        }
    }

    private async refusal(target: RepliableTarget): Promise<{ caught: unknown } | null> {
        try {
            await this.runMiddlewares(target.middlewares);
            await runInteractionGates(this.config.HandlerCtor, target.gateContext());
            return null;
        } catch (caught) {
            return { caught };
        }
    }

    private async runMiddlewares(middlewares: RepliableTarget['middlewares']): Promise<void> {
        const { core, dispatch } = this.config;
        for (const build of middlewares) {
            const middleware = core[HostPlugins].assertMembersKept(build(), dispatch);
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
        const { core, dispatch, interactionId, origin } = this.config;
        reportDispatch(core.bus, {
            dispatch,
            interactionId,
            outcome,
            userId: origin.userId,
            guildId: origin.guildId,
            startedAt: this.startedAt,
            queuedMs: this.queuedMs
        });
    }
}
