import { SeedcordErrorCode, isSeedcordError, paint } from '@seedcord/errors';
import { asError } from '@seedcord/utils/internal';
import { RESTJSONErrorCodes } from 'discord-api-types/v10';

import { MemberValues } from '#src/dispatch/DispatchContext';
import { lazyLogger } from '#src/miscellaneous/lazyLogger';
import { Fault } from '#stops/Fault';
import { Notice } from '#stops/Notice';
import { Silence } from '#stops/Silence';
import { PublishDefault } from '#subscribers/publishDefault';

import { logUnknownFault } from './logUnknownFault';

import type { CoreBase } from '#interfaces/CoreBase';
import type { DispatchContext } from '#src/dispatch/DispatchContext';
import type { FaultSource, SubscriptionData } from '#subscribers/types/Subscriptions';
import type { RenderContext, ReplyResponse } from '@seedcord/types';

// each transport passes the DiscordAPIError that its discord client throws
export type ApiErrorClass = abstract new (...args: never[]) => { readonly code: number | string };

export interface FaultDetails extends Pick<SubscriptionData<'unknownException'>, 'guild' | 'user'> {
    readonly origin: string;
    readonly source: FaultSource | null;
    readonly metadata: unknown;
}

export interface FaultSender {
    send(response: ReplyResponse, options: { ephemeral: boolean }): Promise<unknown>;
}

const logger = lazyLogger('Faults', { channel: 'errors' });

const HARMLESS_API_CODES: ReadonlySet<number | string> = new Set([
    RESTJSONErrorCodes.UnknownInteraction, // interaction expired
    RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged, // interaction was already answered
    RESTJSONErrorCodes.UnknownMessage // message was lost
]);

interface ReportedFault {
    readonly error: Error;
    readonly uuid: RenderContext['uuid'];
}

interface FaultReply {
    readonly response: ReplyResponse;
    readonly ephemeral: boolean;
}

export class FaultBoundary {
    private readonly ignoredCodes: ReadonlySet<number | string>;

    constructor(
        private readonly core: CoreBase,
        ignoredCodes: readonly (number | string)[] | undefined,
        private readonly apiError: ApiErrorClass,
        private readonly dispatch: DispatchContext,
        private readonly detailsOf: () => FaultDetails
    ) {
        this.ignoredCodes = new Set(ignoredCodes);
    }

    // null when the fault is a Silence or has an ignored api code
    public report(caught: unknown): ReportedFault | null {
        const { config } = this.core;
        if (caught instanceof Silence) {
            if (caught.reason !== undefined && (config.errors?.logSilences ?? true)) {
                logger().debug(`Silence: ${caught.reason}`);
            }
            return null;
        }

        const error = asError(caught);
        if (error instanceof this.apiError && this.ignoredCodes.has(error.code)) {
            logger().debug(`swallowed api code ${paint.amber(String(error.code))}`);
            return null;
        }

        const uuid = crypto.randomUUID();
        this.publish(error, uuid);
        return { error, uuid };
    }

    public async answerWithReply(caught: unknown, sender: FaultSender): Promise<void> {
        const fault = this.report(caught);
        const reply = fault && this.rendered(fault);
        if (reply) await this.sendGuarded(() => sender.send(reply.response, { ephemeral: reply.ephemeral }));
    }

    // discord expects a response to every autocomplete, whatever the fault was
    public async answerWithEmptyChoices(caught: unknown, clearChoices: () => Promise<unknown>): Promise<void> {
        this.report(caught);
        await this.sendGuarded(clearChoices);
    }

    private publish(error: Error, uuid: RenderContext['uuid']): void {
        if (error instanceof Notice && !error.report) return;
        const { bus, config } = this.core;
        const { origin, source, guild, user, metadata } = this.detailsOf();
        const from = { uuid, dispatchId: this.dispatch.id, origin };
        if (error instanceof Notice) {
            logger().error(`${error.name}: ${paint.mute(uuid)}`, error);
            if (source) {
                bus[PublishDefault]('handledException', { denial: error, ...from, source });
                return;
            }
        } else logUnknownFault(logger(), paint.mute(uuid), error, config.errors);
        bus[PublishDefault]('unknownException', { ...from, error, guild, user, metadata });
    }

    private rendered(fault: ReportedFault): FaultReply | null {
        try {
            return this.render(fault);
        } catch (renderError) {
            return this.fallbackReply(renderError);
        }
    }

    private fallbackReply(renderError: unknown): FaultReply | null {
        const fallback = this.report(renderError);
        if (!fallback) return null;
        try {
            return this.render(fallback);
        } catch (error) {
            logger().error(`could not render a fault card for route ${paint.sky.bold(this.dispatch.routeId)}`, error);
            return { response: new Fault().render(this.renderContext(fallback.uuid)), ephemeral: true };
        }
    }

    private render({ error, uuid }: ReportedFault): FaultReply {
        const ctx = this.renderContext(uuid);
        if (error instanceof Notice) return { response: error.render(ctx), ephemeral: error.ephemeral };
        // a bot's own card might read the member that just failed
        const Override = isSeedcordError(error, undefined, SeedcordErrorCode.CorePluginMemberThrew)
            ? undefined
            : this.core.config.errors?.defaultError;
        return { response: (Override ? new Override(uuid) : new Fault()).render(ctx), ephemeral: true };
    }

    private renderContext(uuid: RenderContext['uuid']): RenderContext {
        const { dispatch } = this;
        const context = { ...dispatch[MemberValues], uuid, dispatch };
        const developerUsername = this.core.config.notifications?.developerUsername;
        return developerUsername === undefined ? context : { ...context, developerUsername };
    }

    // only this send swallows the harmless codes. a handler's own write still reports them
    private async sendGuarded(send: () => Promise<unknown>): Promise<void> {
        try {
            await send();
        } catch (error) {
            if (error instanceof this.apiError && HARMLESS_API_CODES.has(error.code)) {
                logger().debug(`fault reply hit harmless code ${paint.amber(String(error.code))}`);
                return;
            }
            logger().error(`could not send a fault reply for route ${paint.sky.bold(this.dispatch.routeId)}`, error);
        }
    }
}
