import { render } from 'ink';
import React from 'react';

import { BaseCommand } from '@core/BaseCommand';
import { DevApp } from '@ui/DevApp';
import { DevStore } from '@ui/stores/DevStore';
import { LogStore } from '@ui/stores/LogStore';

import { DevRunner } from './DevRunner';

import type { Command } from '@commander-js/extra-typings';

export class DevCommand extends BaseCommand {
    constructor() {
        super('dev', 'Run a Seedcord instance from the config file', 'Dev');
    }

    public register(program: Command): void {
        program
            .command(this.name)
            .description(this.description)
            .action(async () => {
                // built here so every other command skips the dev machinery
                const store = new DevStore();
                const runner = DevRunner.create(this.logger, store);

                // SIGTERM (and SIGINT when stdin is not raw) trigger a graceful quit. Ink handles the raw-mode
                // Ctrl-C keypress itself. once() self-removes, and the finally removes them on a normal exit.
                const onSignal = (): void => {
                    void runner.quit();
                };
                process.once('SIGINT', onSignal);
                process.once('SIGTERM', onSignal);

                try {
                    await this.runDevApp(store, runner);
                } catch (error: unknown) {
                    this.logger.error('Seedcord dev failed', error);
                    process.exitCode = 1;
                } finally {
                    process.off('SIGINT', onSignal);
                    process.off('SIGTERM', onSignal);
                }

                // the alternate screen is restored by now, so this prints to the normal terminal, a pointer
                // to the log folder since the in-UI logs are gone once the UI unmounts
                this.printLogLocation();

                // Ink's raw-mode stdin and the Vite dev server hold the event loop open after teardown.
                // runDevApp already awaited unmount and shutdown, so exit explicitly.
                process.exit();
            });
    }

    private printLogLocation(): void {
        process.stdout.write('seedcord dev stopped. logs: logs/\n');
    }

    private async runDevApp(store: DevStore, runner: DevRunner): Promise<void> {
        let runResult: Promise<void> = Promise.resolve();

        const { unmount, waitUntilExit } = render(
            React.createElement(DevApp, {
                store,
                onQuit: () => runner.quit(),
                onDisconnect: () => runner.disconnect(),
                onRestart: () => runner.restart(),
                onRefreshCommands: (shouldRefresh: boolean) => runner.refreshCommands(shouldRefresh),
                onReady: () => {
                    runResult = runner.run().finally(async () => {
                        // Drain buffered logs before unmounting Ink so the final lines aren't dropped.
                        await LogStore.instance.flush();
                        unmount();
                    });
                }
            }),
            // Alternate screen (like vim/lazygit): the original terminal + scrollback are restored on quit,
            // and Ink's ESC[3J scrollback purge never fires.
            { exitOnCtrlC: false, alternateScreen: true }
        );

        await waitUntilExit();
        // awaited so a run-loop rejection reaches the action's try/catch before process.exit()
        await runResult;
    }
}
