import { GUIDE_ASK_URL } from '#src/files';
import { guideResult } from '#src/GuideResult';
import { parseQuestion } from '#src/question';
import { readJson } from '#src/readAsset';

import type { GuideResult } from '#src/GuideResult';
import type { GuideHit } from '#src/guideSections';

const TOO_MANY_REQUESTS = 429;
const SERVICE_UNAVAILABLE = 503;
// ask.ts sends 429 for one visitor's limit and 503 for the site's daily Workers AI allowance
const WAIT_STATUSES = new Set([TOO_MANY_REQUESTS, SERVICE_UNAVAILABLE]);

const UNITS = [
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 }
] as const;

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

function wait(seconds: number): string {
    const fits = UNITS.find((size) => seconds >= size.seconds);
    return fits ? relative.format(Math.ceil(seconds / fits.seconds), fits.unit) : relative.format(seconds, 'second');
}

export class TooManySearches extends Error {
    constructor(readonly retryAfterSeconds: number) {
        super(`Too many searches. Try again ${wait(retryAfterSeconds)}.`);
    }
}

async function fetchAnswer(url: string, signal: AbortSignal): Promise<Response> {
    const response = await fetch(url, { signal });
    // retry-after may also hold an HTTP date
    const retryAfter = Number(response.headers.get('retry-after'));
    if (WAIT_STATUSES.has(response.status) && Number.isSafeInteger(retryAfter) && retryAfter > 0) {
        throw new TooManySearches(retryAfter);
    }
    return response;
}

export class GuideSearch {
    constructor(private readonly endpoint = GUIDE_ASK_URL) {}

    async search(input: string, signal: AbortSignal): Promise<GuideResult[]> {
        const question = parseQuestion(input);
        if (question === undefined) return [];

        const url = new URL(this.endpoint);
        url.searchParams.set('q', question);
        const hits = await readJson<GuideHit[]>(url.href, (path) => fetchAnswer(path, signal));
        return hits.map((hit) => guideResult(hit, { by: 'meaning' }));
    }
}
