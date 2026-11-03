import { createInterface } from 'node:readline';

import { debounce } from 'es-toolkit';

import { cliLogger } from '#core/cliLogger';

import type { DevStore } from '#ui/stores/DevStore';
import type { DevRunner } from './DevRunner';
import type { Readable } from 'node:stream';
import type { Promisable } from 'type-fest';

type Command = (runner: DevRunner) => Promisable<void>;

const logger = cliLogger('Dev');

const COMMAND_SAVES_QUIET_MS = 2000;

const COMMANDS = new Map<unknown, Command>([
    ['restart', (runner) => runner.restart()],
    ['codegen', (runner) => runner.writeTypes()],
    ['disconnect', (runner) => runner.disconnect()],
    ['quit', (runner) => runner.quit()]
]);

function commandOn(line: string): Command | undefined {
    try {
        return COMMANDS.get((JSON.parse(line) as { do?: unknown } | null)?.do);
    } catch {
        return undefined;
    }
}

function leaveToRun(command: Promisable<void>): void {
    void Promise.resolve(command).catch(() => undefined); // no reason to handle the rejection here
}

// runs dev without the TUI, answering the prompts nobody is there to press a key for
export async function runPlain(store: DevStore, runner: DevRunner, input: Readable): Promise<void> {
    const refreshCommands = debounce(() => runner.refreshCommands(true), COMMAND_SAVES_QUIET_MS);
    let promptedFiles: string[] | null = null;

    const answerPrompt = (): void => {
        const { commandUpdatePrompt } = store.getState();
        if (commandUpdatePrompt === promptedFiles) return;
        promptedFiles = commandUpdatePrompt;
        if (promptedFiles) refreshCommands();
        else refreshCommands.cancel();
    };

    let failure: Error | undefined;
    const answer = (): void => {
        const { phase, error } = store.getState();
        if (phase === 'restart-required') {
            logger.info('Restarting to pick up the change');
            leaveToRun(runner.restart());
        } else if (phase === 'error' && error !== null) {
            failure ??= error;
            leaveToRun(runner.quit());
        }
    };

    // terminal mode would take ctrl-c away from DevSignals
    using lines = createInterface({ input, terminal: false });
    lines.on('line', (line) => {
        const command = commandOn(line);
        if (command) leaveToRun(command(runner));
        else logger.warn(`Ignoring stdin line: ${line}`);
    });

    store.on('change', answerPrompt);
    store.on('change', answer);
    try {
        await runner.run();
    } finally {
        refreshCommands.cancel();
        store.off('change', answerPrompt);
        store.off('change', answer);
    }
    if (failure) throw failure;
}
