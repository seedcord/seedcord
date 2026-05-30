import { render } from 'ink';
import React from 'react';

import { BaseCommand } from '@core/BaseCommand';
import { DevApp } from '@ui/DevApp';
import { DevStore } from '@ui/stores/DevStore';
import { LogStore } from '@ui/stores/LogStore';
import { SilentLogger } from '@utils/SilentLogger';

import { DevRunner } from './DevRunner';

import type { Command } from '@commander-js/extra-typings';

// console.clear scrolls rather than clears in many terminals; ESC[2J ESC[3J ESC[H wipes screen + scrollback.
// eslint-disable-next-line no-magic-numbers -- 27 is the ESC control code
const ESC = String.fromCharCode(27);
const CLEAR_SCREEN = `${ESC}[2J${ESC}[3J${ESC}[H`;

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
                process.stdout.write(CLEAR_SCREEN);

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

                // Ink's raw-mode stdin and the Vite dev server keep the event loop alive after teardown;
                // runDevApp already awaited unmount + shutdown, so exit explicitly instead of hanging.
                process.exit();
            });
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
                        // Drain buffered logs before tearing down Ink so the final lines aren't dropped.
                        await LogStore.instance.flush();
                        unmount();
                    });
                }
            }),
            { exitOnCtrlC: false }
        );

        await waitUntilExit();
        // Surface a run-loop rejection through the action's try/catch instead of racing process.exit().
        await runResult;
    }
}
