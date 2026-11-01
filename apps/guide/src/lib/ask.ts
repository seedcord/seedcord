import { embedding, loadOnce, parseQuestion, QUESTION_LENGTH, SectionIndex } from '@seedcord/docs-search';
import { GUIDE } from '@seedcord/ui/sites';

import type { Assets } from '@seedcord/ui/fetchAsset';

export interface GuideEnv {
    ASSETS: Assets;
    AI: { run(model: typeof embedding.model, input: { text: string[] }): Promise<{ data: number[][] }> };
    ASK_LIMIT: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

export interface WorkerContext {
    waitUntil(promise: Promise<unknown>): void;
}

const RESULTS = 8;
// 5 minutes caps how long a browser shows paths from the last deploy. the edge key carries the index version
const CACHE_CONTROL = 'public, max-age=300, s-maxage=86400';
const BAD_REQUEST = 400;
const TOO_MANY_REQUESTS = 429;
const SERVICE_UNAVAILABLE = 503;
// the ASK_LIMIT period in wrangler.jsonc
const LIMIT_PERIOD_SECONDS = 60;
const SECOND_MS = 1000;
const DAY_MS = 86_400_000;

// workers ai puts its error code first in the message. 4006 is the daily free allowance running out
const isOutForTheDay = (error: unknown): boolean => error instanceof Error && error.message.startsWith('4006:');

// the free allowance resets at 00:00 UTC
const secondsUntilReset = (now: number): number => Math.ceil((DAY_MS - (now % DAY_MS)) / SECOND_MS);

// the site calls this from localhost in next dev. browsers hide retry-after from other origins unless exposed
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'retry-after' };

const indexFor = loadOnce((request: Request, env: GuideEnv) =>
    SectionIndex.load((path) => env.ASSETS.fetch(new Request(new URL(GUIDE.path + path, request.url))))
);

function refuse(status: number, error: string, headers: Record<string, string> = {}): Response {
    return Response.json({ error }, { status, headers: { ...CORS, ...headers } });
}

export async function ask(request: Request, env: GuideEnv, context: WorkerContext): Promise<Response> {
    const url = new URL(request.url);
    const question = parseQuestion(url.searchParams.get('q') ?? '');
    if (question === undefined) {
        const { min, max } = QUESTION_LENGTH;
        return refuse(BAD_REQUEST, `Pass a question of ${min} to ${max} characters as ?q=.`);
    }

    const index = await indexFor(request, env);
    const key = new URL(url.pathname, url.origin);
    key.searchParams.set('v', index.version);
    key.searchParams.set('q', question);

    const cache = await caches.open('ask');
    const cached = await cache.match(key);
    if (cached) return cached;

    const { success } = await env.ASK_LIMIT.limit({ key: request.headers.get('cf-connecting-ip') ?? 'unknown' });
    if (!success) {
        return refuse(TOO_MANY_REQUESTS, 'Too many searches. Try again in a minute.', {
            'retry-after': String(LIMIT_PERIOD_SECONDS)
        });
    }

    let data: number[][];
    try {
        ({ data } = await env.AI.run(embedding.model, { text: [embedding.query(question)] }));
    } catch (error) {
        if (!isOutForTheDay(error)) throw error;
        return refuse(SERVICE_UNAVAILABLE, 'Search used up its daily Workers AI allowance.', {
            'retry-after': String(secondsUntilReset(Date.now()))
        });
    }
    const [vector] = data;
    if (!vector) throw new Error(`${embedding.model} returned no embedding`);

    const response = Response.json(index.rank(vector, RESULTS), {
        headers: { ...CORS, 'cache-control': CACHE_CONTROL }
    });
    context.waitUntil(cache.put(key, response.clone()));
    return response;
}
