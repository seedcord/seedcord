import { paint } from '@seedcord/errors';
import { asError } from '@seedcord/utils/internal';
import { RESTJSONErrorCodes } from 'discord-api-types/v10';

import { Notice } from '#stops/Notice';
import { Silence } from '#stops/Silence';

import { faultResponse } from './faultResponse';
import { faultLogger, reportFault } from './reportFault';

import type { CoreBase } from '#interfaces/CoreBase';
import type { FaultDetails } from './reportFault';
import type { ReplyResponse } from '@seedcord/types';

// each transport passes the DiscordAPIError that its discord client throws
export type ApiErrorClass = abstract new (...args: never[]) => { readonly code: number | string };

type ReportOf = () => FaultDetails;

const HARMLESS_API_CODES: ReadonlySet<number | string> = new Set([
    RESTJSONErrorCodes.UnknownInteraction, // interaction expired
    RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged, // interaction was already answered
    RESTJSONErrorCodes.UnknownMessage // message was lost
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
    reply(): FaultReply;
}

export class FaultBoundary {
    private readonly ignoredCodes: ReadonlySet<number | string>;

    constructor(
        private readonly core: CoreBase,
        ignoredCodes: readonly (number | string)[] | undefined,
        private readonly apiError: ApiErrorClass
    ) {
        this.ignoredCodes = new Set(ignoredCodes);
    }

    // null when the fault is a Silence or carries an ignored api code
    public report(caught: unknown, reportOf: ReportOf): ReportedFault | null {
        const { config } = this.core;
        if (caught instanceof Silence) {
            if (caught.reason !== undefined && (config.errors?.logSilences ?? true)) {
                faultLogger().debug(`Silence: ${caught.reason}`);
            }
            return null;
        }

        const error = asError(caught);
        if (error instanceof this.apiError && this.ignoredCodes.has(error.code)) {
            faultLogger().debug(`swallowed api code ${paint.amber(String(error.code))}`);
            return null;
        }

        const report = { uuid: crypto.randomUUID(), ...reportOf() };
        reportFault(this.core.bus, config.errors, error, report);
        return {
            reply: () => ({
                response: faultResponse(error, report.uuid, report.dispatch, config),
                ephemeral: error instanceof Notice ? error.ephemeral : true
            })
        };
    }

    public async answer(caught: unknown, routeId: string, reportOf: ReportOf, target: FaultTarget): Promise<void> {
        // discord expects a response to every autocomplete, whatever the fault was
        if ('clearChoices' in target) {
            this.report(caught, reportOf);
            await this.sendGuarded(routeId, () => target.clearChoices());
            return;
        }

        const fault = this.report(caught, reportOf);
        if (!fault) return;

        const reply = this.rendered(fault, routeId, reportOf);
        if (!reply) return;
        await this.sendGuarded(routeId, () => target.reply(reply.response, { ephemeral: reply.ephemeral }));
    }

    private rendered(fault: ReportedFault, routeId: string, reportOf: ReportOf): FaultReply | null {
        try {
            return fault.reply();
        } catch (renderError) {
            return this.fallbackReply(renderError, routeId, reportOf);
        }
    }

    private fallbackReply(renderError: unknown, routeId: string, reportOf: ReportOf): FaultReply | null {
        try {
            return this.report(renderError, reportOf)?.reply() ?? null;
        } catch (error) {
            faultLogger().error(`could not render a fault card for route ${paint.sky.bold(routeId)}`, error);
            return null;
        }
    }

    // only this send swallows the harmless codes. a handler's own write still reports them
    private async sendGuarded(routeId: string, send: () => Promise<unknown>): Promise<void> {
        try {
            await send();
        } catch (error) {
            if (error instanceof this.apiError && HARMLESS_API_CODES.has(error.code)) {
                faultLogger().debug(`fault reply hit harmless code ${paint.amber(String(error.code))}`);
                return;
            }
            faultLogger().error(`could not send a fault reply for route ${paint.sky.bold(routeId)}`, error);
        }
    }
}
