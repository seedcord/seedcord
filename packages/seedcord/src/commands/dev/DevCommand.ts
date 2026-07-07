import { LoggerChannelRegistry } from '@seedcord/services';
import { formatFilePath } from '@seedcord/utils';
import { render } from 'ink';
import React from 'react';

import { BaseCommand } from '@core/BaseCommand';
import { DevApp } from '@ui/DevApp';
import { DevStore } from '@ui/stores/DevStore';
import { LogStore } from '@ui/stores/LogStore';
import { SilentLogger } from '@utils/SilentLogger';

import { DevRunner } from './DevRunner';

import type { Command } from '@commander-js/extra-typings';

export class DevCommand extends BaseCommand {
    private readonly runner: DevRunner;
    private readonly store: DevStore;

    constructor() {
        super('dev', 'Run a Seedcord instance from the config file', 'CLI:Dev');
        this.store = new DevStore();
        this.runner = DevRunner.create(new SilentLogger(), this.store);
    }

    public register(program: Command): void {
        program
            .command(this.name)
            .description(this.description)
            .action(async () => {
                // SIGTERM (and SIGINT when stdin is not raw) trigger a graceful quit; Ink handles the raw-mode
                // Ctrl-C keypress itself. once() self-removes; the finally removes them on a normal exit.
                const onSignal = (): void => {
                    void this.runner.quit();
                };
                process.once('SIGINT', onSignal);
                process.once('SIGTERM', onSignal);

                try {
                    await this.runDevApp();
                } catch (error: unknown) {
                    this.logger.error('Seedcord dev failed', error);
                    process.exitCode = 1;
                } finally {
                    process.off('SIGINT', onSignal);
                    process.off('SIGTERM', onSignal);
                }

                // The alternate screen has been restored by now, so this lands in the normal terminal: a
                // pointer to the on-disk log file, since the in-UI logs are gone once the UI unmounts.
                this.printLogLocation();

                // Ink's raw-mode stdin and the Vite dev server keep the event loop alive after teardown;
                // runDevApp already awaited unmount + shutdown, so exit explicitly instead of hanging.
                process.exit();
            });
    }

    private printLogLocation(): void {
        const registry = LoggerChannelRegistry.instance;
        const path = registry.getLogFilePath(registry.getDefaultChannel());
        if (path) process.stdout.write(`seedcord dev stopped. logs: ${formatFilePath(path)}\n`);
    }

    private async runDevApp(): Promise<void> {
        let runResult: Promise<void> = Promise.resolve();

        const { unmount, waitUntilExit } = render(
            React.createElement(DevApp, {
                store: this.store,
                onQuit: () => this.runner.quit(),
                onDisconnect: () => this.runner.disconnect(),
                onRestart: () => this.runner.restart(),
                onRefreshCommands: (shouldRefresh: boolean) => this.runner.refreshCommands(shouldRefresh),
                onReady: () => {
                    runResult = this.runner.run().finally(async () => {
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
        // Surface a run-loop rejection through the action's try/catch instead of racing process.exit().
        await runResult;
    }
}
