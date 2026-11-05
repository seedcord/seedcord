import type { GuideResult } from '#src/GuideResult';

export type GuideAnswer = { hits: GuideResult[] } | { retryAfterSeconds: number };

// the methods a worker gets on a service binding to seedcord-guide
export interface GuideService {
    ask(question: string): Promise<GuideAnswer>;
}
