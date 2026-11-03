import type { ValueOf } from 'type-fest';

export const ASK_WAIT_STATUS = { tooManySearches: 429, outOfAllowance: 503 } as const;

export type AskWaitStatus = ValueOf<typeof ASK_WAIT_STATUS>;

const WAIT_REASONS: Record<AskWaitStatus, string> = {
    [ASK_WAIT_STATUS.tooManySearches]: 'Too many searches.',
    [ASK_WAIT_STATUS.outOfAllowance]: 'The guide search hit its daily limit.'
};

export const isAskWaitStatus = (status: number): status is AskWaitStatus => status in WAIT_REASONS;

const UNITS = [
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 }
] as const;

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

function tryAgainIn(seconds: number): string {
    const fits = UNITS.find((size) => seconds >= size.seconds);
    return fits ? relative.format(Math.ceil(seconds / fits.seconds), fits.unit) : relative.format(seconds, 'second');
}

export const waitMessage = (status: AskWaitStatus, seconds: number): string =>
    `${WAIT_REASONS[status]} Try again ${tryAgainIn(seconds)}.`;

export class SearchUnavailable extends Error {
    constructor(status: AskWaitStatus, retryAfterSeconds: number) {
        super(waitMessage(status, retryAfterSeconds));
    }
}
