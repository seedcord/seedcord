import { ASK_WAIT_STATUS, parseQuestion, QUESTION_RULE, waitMessage } from '@seedcord/docs-search';

import { GuideAnswers } from '#lib/GuideAnswers';

import type { AnswerEnv } from '#lib/GuideAnswers';
import type { AskWaitStatus } from '@seedcord/docs-search';

export interface GuideEnv extends AnswerEnv {
    ASK_LIMIT: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

export interface WorkerContext {
    waitUntil(promise: Promise<unknown>): void;
}

// 5 minutes caps how long a browser shows paths from the last deploy. the edge key includes the index version
const CACHE_CONTROL = 'public, max-age=300, s-maxage=86400';
const BAD_REQUEST = 400;
// the ASK_LIMIT period in wrangler.jsonc
const LIMIT_PERIOD_SECONDS = 60;

// the site calls this from localhost in next dev. browsers hide retry-after from other origins unless exposed
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'retry-after' };

function refuse(status: number, error: string, headers: Record<string, string> = {}): Response {
    return Response.json({ error }, { status, headers: { ...CORS, ...headers } });
}

function refuseWithWait(status: AskWaitStatus, seconds: number): Response {
    return refuse(status, waitMessage(status, seconds), { 'retry-after': String(seconds) });
}

export async function ask(request: Request, env: GuideEnv, context: WorkerContext): Promise<Response> {
    const url = new URL(request.url);
    const question = parseQuestion(url.searchParams.get('q') ?? '');
    if (question === undefined) return refuse(BAD_REQUEST, `Pass a question as ?q=. It has to be ${QUESTION_RULE}.`);

    const answers = new GuideAnswers(env);
    const index = await answers.index();
    const key = new URL(url.pathname, url.origin);
    key.searchParams.set('v', index.version);
    key.searchParams.set('q', question);

    const cache = await caches.open('ask');
    const cached = await cache.match(key);
    if (cached) return cached;

    const { success } = await env.ASK_LIMIT.limit({ key: request.headers.get('cf-connecting-ip') ?? 'unknown' });
    if (!success) return refuseWithWait(ASK_WAIT_STATUS.tooManySearches, LIMIT_PERIOD_SECONDS);

    const ranked = await answers.rank(question, index);
    if ('retryAfterSeconds' in ranked) return refuseWithWait(ASK_WAIT_STATUS.outOfAllowance, ranked.retryAfterSeconds);

    const response = Response.json(ranked.hits, { headers: { ...CORS, 'cache-control': CACHE_CONTROL } });
    context.waitUntil(cache.put(key, response.clone()));
    return response;
}
