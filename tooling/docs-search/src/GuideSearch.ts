import { GUIDE_ASK_URL } from '#src/files';
import { guideResult } from '#src/GuideResult';
import { parseQuestion } from '#src/question';
import { readJson } from '#src/readAsset';

import type { GuideResult } from '#src/GuideResult';
import type { GuideHit } from '#src/guideSections';

const TOO_MANY_REQUESTS = 429;

export class TooManySearches extends Error {
    constructor(readonly retryAfterSeconds: number) {
        super(`Too many searches. Try again in ${retryAfterSeconds} seconds.`);
    }
}

async function fetchAnswer(url: string, signal: AbortSignal): Promise<Response> {
    const response = await fetch(url, { signal });
    // retry-after may also hold an HTTP date
    const retryAfter = Number(response.headers.get('retry-after'));
    if (response.status === TOO_MANY_REQUESTS && Number.isSafeInteger(retryAfter) && retryAfter > 0) {
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
