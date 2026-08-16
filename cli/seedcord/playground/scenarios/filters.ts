import type { PreviewLogLevel, Scenario } from './types';

const FEED: readonly (readonly [string, string, PreviewLogLevel])[] = [
    ['bot', 'Ready. 3 guilds, 142 members.', 'info'],
    ['db', 'Connected to postgres.', 'info'],
    ['db', 'Slow query 820ms on users.', 'warn'],
    ['http', 'GET /health 200 1ms', 'debug'],
    ['cache', 'miss key session:abc', 'trace'],
    ['events', 'messageCreate from user#1234', 'debug'],
    ['bot', 'Interaction /play failed', 'error'],
    ['hmr', 'watching src/**/*.ts', 'info'],
    ['cache', 'evicted 12 keys', 'trace'],
    ['http', 'GET /metrics 200 3ms', 'debug']
];

const TRACE_BLOCK = 'Loaded handlers\nPingHandler ./src/Ping.ts\nFeedHandler ./src/Feed.ts\n3 slash · 1 button';

const STEP_MS = 220;
const TRACE_EVERY = 3;

export const filters: Scenario = {
    name: 'filters',
    description: 'Multi-channel logs across all five levels with trace blocks, for the channel + level filter',
    async run(ctx) {
        ctx.store.setTransport({ name: '@seedcord/gateway', version: '0.16.0' });
        ctx.store.setPhase('running');
        ctx.store.setBusy(false);
        ctx.store.setStatus('Connected as PreviewBot#0001');

        for (let round = 0; !ctx.isAborted(); round += 1) {
            if (round % TRACE_EVERY === 0) ctx.log('bot', TRACE_BLOCK, 'trace');
            for (const [channel, line, level] of FEED) {
                if (ctx.isAborted()) return;
                ctx.log(channel, `${line} (#${round})`, level);
                await ctx.wait(STEP_MS);
            }
        }
    }
};
