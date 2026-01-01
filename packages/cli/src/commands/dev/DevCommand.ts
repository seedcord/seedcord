import { isSeedcordError } from '@seedcord/services';
import { render } from 'ink';
import React from 'react';

import { BaseCommand } from '@core/BaseCommand';
import { DevApp } from '@ui/DevApp';
import { SilentLogger } from '@utils/SilentLogger';

import { DevRunner } from './DevRunner';

import type { Command } from 'commander';

export class DevCommand extends BaseCommand {
    private readonly runner: DevRunner;

    constructor() {
        super('dev', 'Run a Seedcord instance from the config file', 'CLI:Dev');
        this.runner = DevRunner.create(new SilentLogger());
    }

    public register(program: Command): void {
        program
            .command(this.name)
            .description(this.description)
            .action(async () => {
                try {
                    // eslint-disable-next-line no-console
                    console.clear();

                    const { unmount, waitUntilExit } = render(
                        React.createElement(DevApp, {
                            onQuit: () => this.runner.quit(),
                            onDisconnect: () => this.runner.disconnect(),
                            onRestart: () => this.runner.restart(),
                            onRefreshCommands: (shouldRefresh: boolean) => this.runner.refreshCommands(shouldRefresh),
                            onReady: (actions) => {
                                void this.runner
                                    .run(actions)
                                    .then(async () => {
                                        // Wait a bit for logs to flush
                                        await new Promise((resolve) => setTimeout(resolve, 1000));
                                        unmount();
                                    })
                                    .catch((error) => {
                                        this.logger.error('Runner failed', error);
                                        unmount();
                                        process.exit(1);
                                    });
                            }
                        }),
                        {
                            exitOnCtrlC: false
                        }
                    );

                    process.on('SIGINT', () => {
                        void this.runner.quit();
                    });

                    await waitUntilExit();
                    process.exit(0);
                } catch (error: unknown) {
                    this.logger.error('Seedcord dev failed', error);
                    if (isSeedcordError(error)) process.exitCode = 1;
                    else process.exit(1);
                }
            });
    }
}
