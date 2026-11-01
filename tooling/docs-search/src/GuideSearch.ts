import { GUIDE } from '@seedcord/ui/sites';

import { GUIDE_ASK_URL } from '#src/files';
import { readJson } from '#src/readAsset';

import type { GuideHit } from '#src/guideSections';

export interface GuideResult extends GuideHit {
    url: string;
    excerpt?: string;
}

export const guideResult = (hit: GuideHit): GuideResult => ({ ...hit, url: GUIDE.at(hit.path) });

export const QUESTION_LENGTH = { min: 2, max: 200 } as const;

export function parseQuestion(input: string): string | undefined {
    const question = input.trim();
    return question.length >= QUESTION_LENGTH.min && question.length <= QUESTION_LENGTH.max ? question : undefined;
}

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
        return hits.map(guideResult);
    }
}
