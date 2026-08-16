import type { Scenario } from './types';

const BEFORE_CHANGE_MS = 800;

export const restartRequiredFromFileChange: Scenario = {
    name: 'restart-required',
    description: 'Running, then a critical file change forces restart-required',
    async run(ctx) {
        ctx.store.setTransport({ name: '@seedcord/gateway', version: '0.16.0' });
        ctx.store.setPhase('running');
        ctx.store.setBusy(false);
        ctx.store.setStatus('Connected as PreviewBot#0001');
        ctx.log('hmr', 'watching for changes');
        await ctx.wait(BEFORE_CHANGE_MS);

        ctx.log('hmr', 'changed: src/core/bot.ts (not hot-reloadable)', 'warn');
        ctx.emit({ type: 'restart-required' });
    }
};
