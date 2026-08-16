import type { Scenario } from './types';

const FEED: readonly (readonly [string, string])[] = [
    ['bot', 'Ready. 3 guilds, 142 members.'],
    ['bot', 'Registered 12 application commands.'],
    ['http', 'GET /health 200 1ms'],
    ['hmr', 'watching src/**/*.ts'],
    ['bot', 'Interaction /ping from user#1234'],
    ['http', 'GET /metrics 200 3ms'],
    ['bot', 'Interaction /play from user#5678'],
    ['hmr', 'no changes detected'],
    ['http', 'GET /health 200 1ms'],
    ['bot', 'Interaction /queue from user#9012']
];

const STEP_MS = 280;
const LOAD_MS = 500;
const CONNECT_MS = 700;

export const happyStartup: Scenario = {
    name: 'happy-startup',
    description: 'Starting to running, then a steady stream of multi-channel logs (good for scroll + filter)',
    async run(ctx) {
        ctx.store.setTransport({ name: '@seedcord/gateway', version: '0.16.0' });
        ctx.store.setPhase('starting');
        ctx.store.setStatus('Loading config…');
        await ctx.wait(LOAD_MS);

        ctx.store.setStatus('Connecting to Discord…');
        await ctx.wait(CONNECT_MS);

        ctx.store.setPhase('running');
        ctx.store.setBusy(false);
        ctx.store.setStatus('Connected as PreviewBot#0001');

        // runs forever so there's always fresh output to scroll and filter
        for (let round = 0; !ctx.isAborted(); round += 1) {
            for (const [channel, line] of FEED) {
                if (ctx.isAborted()) return;
                ctx.log(channel, `${line} (#${round})`);
                await ctx.wait(STEP_MS);
            }
        }
    }
};
