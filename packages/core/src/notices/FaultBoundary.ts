import { paint } from '@seedcord/errors';
import { asError } from '@seedcord/utils/internal';
import { RESTJSONErrorCodes } from 'discord-api-types/v10';

import { Notice } from '#stops/Notice';
import { Silence } from '#stops/Silence';

import { faultResponse } from './faultResponse';
import { reportFault } from './reportFault';

import type { CoreBase } from '#interfaces/CoreBase';
import type { FaultReport } from './reportFault';
import type { Logger } from '@seedcord/logger';
import type { RenderContext, ReplyResponse } from '@seedcord/types';

// each transport passes the DiscordAPIError that its discord client throws
type ApiErrorClass = abstract new (...args: never[]) => { readonly code: number | string };

type ReportOf = (uuid: RenderContext['uuid']) => FaultReport;

// each one means the interaction is already gone
const HARMLESS_API_CODES: ReadonlySet<number | string> = new Set([
    RESTJSONErrorCodes.UnknownInteraction,
    RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged,
    RESTJSONErrorCodes.UnknownMessage
]);

// discord doesn't accept a message on an autocomplete. empty choices clear the client's loading spinner.
export type FaultTarget =
    | { reply(response: ReplyResponse, options: { ephemeral: boolean }): Promise<unknown> }
    | { clearChoices(): Promise<unknown> };

interface FaultReply {
    readonly response: ReplyResponse;
    readonly ephemeral: boolean;
}

interface ReportedFault {
    readonly routeId: string;
    reply(): FaultReply;
}

export class FaultBoundary {
    private readonly ignoredCodes: ReadonlySet<number | string>;

    constructor(
        private readonly core: CoreBase,
        ignoredCodes: readonly (number | string)[] | undefined,
        private readonly apiError: ApiErrorClass,
        private readonly logger: Logger
    ) {
        this.ignoredCodes = new Set(ignoredCodes);
    }

    // null when the fault is a Silence or carries an ignored api code
    public report(caught: unknown, reportOf: ReportOf): ReportedFault | null {
        const { config } = this.core;
        if (caught instanceof Silence) {
            if (caught.reason !== undefined && (config.errors?.logSilences ?? true)) {
                this.logger.debug(`Silence: ${caught.reason}`);
            }
            return null;
        }

        const error = asError(caught);
        if (error instanceof this.apiError && this.ignoredCodes.has(error.code)) {
            this.logger.debug(`swallowed api code ${paint.amber(String(error.code))}`);
            return null;
        }

        const report = reportOf(crypto.randomUUID());
        reportFault(this.core.bus, config.errors, error, report);
        return {
            routeId: report.dispatch.routeId,
            reply: () => ({
                response: faultResponse(error, report.uuid, report.dispatch, config),
                ephemeral: error instanceof Notice ? error.ephemeral : true
            })
        };
    }

    public async answer(caught: unknown, reportOf: ReportOf, target: FaultTarget): Promise<void> {
        const fault = this.report(caught, reportOf);
        if (!fault) return;

        if ('clearChoices' in target) {
            await this.sendGuarded(fault.routeId, () => target.clearChoices());
            return;
        }

        const reply = this.rendered(fault, reportOf);
        if (!reply) return;
        await this.sendGuarded(fault.routeId, () => target.reply(reply.response, { ephemeral: reply.ephemeral }));
    }

    // the reply shows the card for whatever render() threw
    private rendered(fault: ReportedFault, reportOf: ReportOf): FaultReply | null {
        try {
            return fault.reply();
        } catch (renderError) {
            return this.fallbackReply(renderError, fault.routeId, reportOf);
        }
    }

    private fallbackReply(renderError: unknown, routeId: string, reportOf: ReportOf): FaultReply | null {
        try {
            return this.report(renderError, reportOf)?.reply() ?? null;
        } catch (error) {
            this.logger.error(`could not render a fault card for route ${paint.sky.bold(routeId)}`, error);
            return null;
        }
    }

    // only this send swallows the harmless codes. a handler's own write still reports them
    private async sendGuarded(routeId: string, send: () => Promise<unknown>): Promise<void> {
        try {
            await send();
        } catch (error) {
            if (error instanceof this.apiError && HARMLESS_API_CODES.has(error.code)) {
                this.logger.debug(`boundary send hit harmless code ${paint.amber(String(error.code))}`);
                return;
            }
            this.logger.error(`boundary send failed for route ${paint.sky.bold(routeId)}`, error);
        }
    }
}
