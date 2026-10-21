import { describe, expect, it, vi } from 'vitest';

import { DEV_SIGNALS, DevSignals } from '#commands/dev/DevSignals';

import { edgeProject, startedRuntime } from './edgeDevRuntime';

describe('DevSignals', () => {
    it('quits through its own handler while miniflare runs', async () => {
        await using project = await edgeProject();
        const quit = vi.fn();
        using _signals = DevSignals.own(quit);
        await using _started = await startedRuntime(project.projectDir);
        // miniflare's exit hook calls process.exit from its own SIGINT listener
        using exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

        process.emit('SIGINT');

        expect(exit).not.toHaveBeenCalled();
        expect(quit).toHaveBeenCalledOnce();
    }, 60_000);

    it('hands every signal back to node after the first', () => {
        const counts = (): number[] => DEV_SIGNALS.map((signal) => process.listenerCount(signal));
        const before = counts();
        using _signals = DevSignals.own(() => undefined);

        process.emit('SIGINT');

        expect(counts()).toEqual(before);
    });
});
