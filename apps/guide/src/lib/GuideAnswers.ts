import { PRODUCTION_ORIGIN } from '@seedcord/brand';
import { embedding, guideResult, loadOnce, parseQuestion, QUESTION_RULE, SectionIndex } from '@seedcord/docs-search';
import { GUIDE } from '@seedcord/ui/sites';

import { ERROR_CODES } from '#lib/errorCodes';

import type { GuideAnswer, GuideService, Question } from '@seedcord/docs-search';
import type { Assets } from '@seedcord/ui/fetchAsset';

export interface AnswerEnv {
    ASSETS: Assets;
    AI: { run(model: typeof embedding.model, input: { text: string[] }): Promise<{ data: number[][] }> };
}

type Ranked = { hits: ReturnType<SectionIndex['rank']> } | Extract<GuideAnswer, { retryAfterSeconds: number }>;

const RESULTS = 8;
const SECOND_MS = 1000;
const DAY_MS = 86_400_000;

// workers ai puts its error code first in the message. 4006 is the daily free allowance running out
const isOutForTheDay = (error: unknown): boolean => error instanceof Error && error.message.startsWith('4006:');

// the free allowance resets at 00:00 UTC
const secondsUntilReset = (now: number): number => Math.ceil((DAY_MS - (now % DAY_MS)) / SECOND_MS);

// the assets binding reads only the path
const indexFor = loadOnce((env: AnswerEnv) =>
    SectionIndex.load((path) => env.ASSETS.fetch(new Request(new URL(GUIDE.path + path, PRODUCTION_ORIGIN))))
);

export class GuideAnswers implements GuideService {
    constructor(private readonly env: AnswerEnv) {}

    index(): Promise<SectionIndex> {
        return indexFor(this.env);
    }

    async rank(asked: Question, index: SectionIndex): Promise<Ranked> {
        const { question } = ERROR_CODES.read(asked);
        let data: number[][];
        try {
            ({ data } = await this.env.AI.run(embedding.model, { text: [embedding.query(question)] }));
        } catch (error) {
            if (!isOutForTheDay(error)) throw error;
            return { retryAfterSeconds: secondsUntilReset(Date.now()) };
        }
        const [vector] = data;
        if (!vector) throw new Error(`${embedding.model} didn't return an embedding.`);
        return { hits: index.rank(vector, RESULTS) };
    }

    // the calling worker limits its own users
    async ask(input: string): Promise<GuideAnswer> {
        const question = parseQuestion(input);
        if (question === undefined) throw new Error(`A question has to be ${QUESTION_RULE}.`);

        const ranked = await this.rank(question, await this.index());
        if ('retryAfterSeconds' in ranked) return ranked;
        return { hits: ranked.hits.map((hit) => guideResult(hit, { by: 'meaning' }, GUIDE)) };
    }
}
