import { render } from 'ink';
import React from 'react';

import { BaseCommand } from '@core/BaseCommand';
import { DevApp } from '@ui/DevApp';
import { profileFrame, profileReport, profileStdout } from '@ui/profile';
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
                profileStdout();
                const store = new DevStore();
                const runner = DevRunner.create(this.logger, store);

                // ink intercepts Ctrl-C under raw mode. this fires only when stdin is not raw.
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

                // the in-ui logs went with the unmount
                this.printLogLocation();

                // ink's raw stdin and vite's dev server keep the event loop alive after teardown
                process.exit();
            });
    }

    private printLogLocation(): void {
        process.stdout.write('seedcord dev stopped. logs: logs/\n');

        const report = profileReport();
        if (report !== null) process.stdout.write(`${report}\n`);
    }

    private async runDevApp(store: DevStore, runner: DevRunner): Promise<void> {
        let failure: { error: unknown } | undefined;
        let runResult: Promise<void> = Promise.resolve();

        const { unmount, waitUntilExit } = render(
            React.createElement(DevApp, {
                store,
                onQuit: () => runner.quit(),
                onDisconnect: () => runner.disconnect(),
                onRestart: () => runner.restart(),
                onRefreshCommands: (shouldRefresh: boolean) => runner.refreshCommands(shouldRefresh),
                onReady: () => {
                    runResult = runner
                        .run()
                        .finally(async () => {
                            // unmounting first drops the buffered lines
                            await LogStore.instance.flush();
                            unmount();
                        })
                        // node kills the process over an unwatched rejection
                        .catch((error: unknown) => {
                            failure = { error };
                        });
                }
            }),
            // the alternate screen restores the terminal and scrollback on quit, and ink's ESC[3J purge never fires
            {
                exitOnCtrlC: false,
                alternateScreen: true,
                onRender: ({ renderTime }) => {
                    profileFrame(renderTime);
                }
            }
        );

        await waitUntilExit();
        // a run-loop failure has to reach the action's catch before process.exit()
        await runResult;
        if (failure) throw failure.error;
    }
}
