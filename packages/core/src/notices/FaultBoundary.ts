import { paint } from '@seedcord/errors';
import { asError } from '@seedcord/utils/internal';

import { Notice } from '#stops/Notice';
import { Silence } from '#stops/Silence';

import { faultResponse } from './faultResponse';
import { reportFault } from './reportFault';

import type { CoreBase } from '#interfaces/CoreBase';
import type { FaultReport } from './reportFault';
import type { Logger } from '@seedcord/logger';
import type { RenderContext, ReplyResponse } from '@seedcord/types';

// each transport passes the DiscordAPIError its own discord client throws
type ApiErrorClass = abstract new (...args: never[]) => { readonly code: number | string };

/** @internal */
export interface ReportedFault {
    readonly ephemeral: boolean;
    response(): ReplyResponse;
}

/** @internal */
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
    public report(caught: unknown, reportOf: (uuid: RenderContext['uuid']) => FaultReport): ReportedFault | null {
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
            ephemeral: error instanceof Notice ? error.ephemeral : true,
            response: () => faultResponse(error, report.uuid, report.dispatch, config)
        };
    }
}
