import { GUIDE } from '@seedcord/ui/sites';

import { GUIDE_ASK_URL } from '#src/files';

import type { GuideHit } from '#src/guideSections';

export interface GuideResult extends GuideHit {
    url: string;
}

export const guideResult = (hit: GuideHit): GuideResult => ({ ...hit, url: GUIDE.at(hit.path) });

export const QUESTION_LENGTH = { min: 2, max: 200 } as const;

export function parseQuestion(input: string): string | undefined {
    const question = input.trim();
    return question.length >= QUESTION_LENGTH.min && question.length <= QUESTION_LENGTH.max ? question : undefined;
}

export class GuideSearch {
    constructor(private readonly endpoint = GUIDE_ASK_URL) {}

    async search(input: string): Promise<GuideResult[]> {
        const question = parseQuestion(input);
        if (question === undefined) return [];

        const url = new URL(this.endpoint);
        url.searchParams.set('q', question);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Guide search failed with status ${response.status}`);

        // the guide worker writes this from the same type
        const hits = (await response.json()) as GuideHit[];
        return hits.map(guideResult);
    }
}
