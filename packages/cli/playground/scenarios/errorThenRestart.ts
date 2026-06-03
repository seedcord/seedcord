import { FIXTURE_CONFIG } from '../fixtures';

import type { Scenario } from './types';

const STACK = [
    'TypeError: Cannot read properties of undefined (reading "guild")',
    '    at PingCommand.execute (src/interactions/ping.ts:14:23)',
    '    at InteractionRouter.dispatch (src/core/router.ts:88:19)',
    '    at Client.<anonymous> (src/core/bot.ts:201:11)'
].join('\n');

const BEFORE_ERROR_MS = 600;

export const errorThenRestart: Scenario = {
    name: 'error-then-restart',
    description: 'Running, then an uncaught error card; press r to restart',
    async run(ctx) {
        ctx.store.setConfig(FIXTURE_CONFIG);
        ctx.store.setPhase('running');
        ctx.store.setBusy(false);
        ctx.store.setStatus('Connected as PreviewBot#0001');
        ctx.log('bot', 'Handling interaction /ping');
        await ctx.wait(BEFORE_ERROR_MS);

        const error = new Error('Cannot read properties of undefined (reading "guild")');
        error.name = 'TypeError';
        error.stack = STACK;
        ctx.store.setError(error);
        ctx.store.setPhase('error');
        ctx.store.setStatus('Session crashed.');
    }
};
