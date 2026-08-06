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

                // SIGINT reaches here only when stdin is not raw, Ink handles the raw-mode Ctrl-C itself
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

                // the in-UI logs are gone once the UI unmounts, so point at the folder on the normal terminal
                this.printLogLocation();

                // Ink's raw-mode stdin and the Vite dev server hold the event loop open after teardown
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
                        // unmounting first would drop the buffered lines
                        await LogStore.instance.flush();
                        unmount();
                    });
                }
            }),
            // the alternate screen restores the terminal and scrollback on quit, and Ink's ESC[3J purge never fires
            { exitOnCtrlC: false, alternateScreen: true }
        );

        await waitUntilExit();
        // awaited so a run-loop rejection reaches the action's try/catch before process.exit()
        await runResult;
    }
}
