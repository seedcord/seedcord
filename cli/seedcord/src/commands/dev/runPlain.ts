import { createInterface } from 'node:readline';

import { cliLogger } from '#core/cliLogger';

import type { DevStore } from '#ui/stores/DevStore';
import type { DevRunner } from './DevRunner';
import type { Readable } from 'node:stream';

const logger = cliLogger('Dev');

const COMMANDS = new Map<unknown, (runner: DevRunner) => Promise<void>>([
    ['restart', (runner) => runner.restart()],
    ['disconnect', (runner) => runner.disconnect()],
    ['quit', (runner) => runner.quit()]
]);

function commandOn(line: string): ((runner: DevRunner) => Promise<void>) | undefined {
    try {
        return COMMANDS.get((JSON.parse(line) as { do?: unknown } | null)?.do);
    } catch {
        return undefined;
    }
}

// runs dev without the TUI, answering the prompts nobody is there to press a key for
export async function runPlain(store: DevStore, runner: DevRunner, input: Readable): Promise<void> {
    let failure: Error | undefined;
    const answer = (): void => {
        const { phase, commandUpdatePrompt, error } = store.getState();
        if (commandUpdatePrompt !== null) runner.refreshCommands(true);
        if (phase === 'restart-required') {
            logger.info('Restarting to pick up the change');
            void runner.restart();
        } else if (phase === 'error' && error !== null) {
            failure ??= error;
            void runner.quit();
        }
    };

    // terminal mode would take ctrl-c away from DevSignals
    const lines = createInterface({ input, terminal: false });
    lines.on('line', (line) => {
        const command = commandOn(line);
        if (command) void command(runner);
        else logger.warn(`Ignoring stdin line: ${line}`);
    });

    store.on('change', answer);
    try {
        await runner.run();
    } finally {
        store.off('change', answer);
        lines.close();
    }
    if (failure) throw failure;
}
