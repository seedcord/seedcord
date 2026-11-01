import { embedding, parseQuestion, QUESTION_LENGTH, SectionIndex } from '@seedcord/docs-search';
import { GUIDE } from '@seedcord/ui/sites';

import { loadOnce } from './loadOnce';

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
// the ASK_LIMIT period in wrangler.jsonc
const LIMIT_PERIOD_SECONDS = 60;

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

    const { data } = await env.AI.run(embedding.model, { text: [embedding.query(question)] });
    const [vector] = data;
    if (!vector) throw new Error(`${embedding.model} returned no embedding`);

    const response = Response.json(index.rank(vector, RESULTS), {
        headers: { ...CORS, 'cache-control': CACHE_CONTROL }
    });
    context.waitUntil(cache.put(key, response.clone()));
    return response;
}
