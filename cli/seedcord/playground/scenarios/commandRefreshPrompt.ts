import type { Scenario } from './types';

const BEFORE_PROMPT_MS = 500;

export const commandRefreshPrompt: Scenario = {
    name: 'command-refresh',
    description: 'Running, then a command-file change raises the y/n refresh prompt',
    async run(ctx) {
        ctx.store.setTransport({ name: '@seedcord/gateway', version: '0.16.0' });
        ctx.store.setPhase('running');
        ctx.store.setBusy(false);
        ctx.store.setStatus('Connected as PreviewBot#0001');
        await ctx.wait(BEFORE_PROMPT_MS);

        ctx.emit({
            type: 'command-update-prompt',
            files: ['src/interactions/ping.ts', 'src/interactions/ban.ts']
        });
    }
};
