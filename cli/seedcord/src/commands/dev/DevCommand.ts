import { WORDMARK } from '@seedcord/errors/internal';
import { isInteractive } from '@seedcord/utils/internal';

import { BaseCommand } from '#core/BaseCommand';
import { cliLogger } from '#core/cliLogger';
import { StateFolder } from '#core/state/StateFolder';
import { profileReport, profileStdout } from '#ui/profile.ts';
import { DevStore } from '#ui/stores/DevStore.ts';

import { DevRunner } from './DevRunner';
import { DevSignals } from './DevSignals';
import { routeConsoleToLogs } from './routeConsoleToLogs';
import { runPlain } from './runPlain';

import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

export class DevCommand extends BaseCommand {
    private readonly logger = cliLogger('Dev');

    constructor() {
        super('dev', 'Run the bot from the config file');
    }

    public register(program: Command): CommandUnknownOpts {
        return this.define(program).action(async () => {
            profileStdout();
            const store = new DevStore();
            const stateFolder = new StateFolder(process.cwd(), this.logger);
            const runner = DevRunner.create(store, stateFolder);

            try {
                // ink takes Ctrl-C itself in raw mode
                using _signals = DevSignals.own(() => void runner.quit());
                using _console = routeConsoleToLogs();
                if (isInteractive()) {
                    // don't statically import runDevApp because it
                    // loads react before seedcord build sets NODE_ENV
                    const { runDevApp } = await import('./runDevApp');
                    await runDevApp(store, runner, stateFolder);
                } else {
                    await runPlain(store, runner, process.stdin);
                }
            } catch (error: unknown) {
                this.logger.error(`${WORDMARK} dev failed`, error);
                process.exitCode = 1;
            }

            // the in-ui logs went with the unmount
            await this.printLogLocation();

            // ink's raw stdin and vite's dev server keep the event loop alive after teardown
            process.exit();
        });
    }

    private async printLogLocation(): Promise<void> {
        this.logger.info(`${WORDMARK} dev stopped. logs: logs/`);

        const report = profileReport();
        if (report !== null) this.logger.info(report);

        // process.exit() discards whatever a piped stdout has not flushed
        await new Promise((resolve) => {
            process.stdout.write('', resolve);
        });
    }
}
