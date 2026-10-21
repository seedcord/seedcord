import { cliLogger } from '#core/cliLogger';

import type { DevStore } from '#ui/stores/DevStore';
import type { DevRunner } from './DevRunner';

const logger = cliLogger('Dev');

// runs dev without the TUI, answering the prompts nobody is there to press a key for
export async function runPlain(store: DevStore, runner: DevRunner): Promise<void> {
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

    store.on('change', answer);
    try {
        await runner.run();
    } finally {
        store.off('change', answer);
    }
    if (failure) throw failure;
}
