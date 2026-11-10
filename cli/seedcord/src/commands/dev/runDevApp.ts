import { render } from 'ink';
import React from 'react';

import { DevApp } from '#ui/DevApp';
import { devPrefsFile } from '#ui/devPrefs';
import { profileFrame } from '#ui/profile';
import { LogStore } from '#ui/stores/LogStore';

import type { StateFolder } from '#core/state/StateFolder';
import type { DevStore } from '#ui/stores/DevStore';
import type { DevRunner } from './DevRunner';

export async function runDevApp(store: DevStore, runner: DevRunner, stateFolder: StateFolder): Promise<void> {
    let failure: { error: unknown } | undefined;
    let runResult: Promise<void> = Promise.resolve();

    const { unmount, waitUntilExit } = render(
        React.createElement(DevApp, {
            store,
            initialPrefs: stateFolder.read(devPrefsFile),
            onPrefsChange: (prefs) => {
                stateFolder.write(devPrefsFile, prefs);
            },
            onQuit: () => runner.quit(),
            onDisconnect: () => runner.disconnect(),
            onRestart: () => runner.restart(),
            onCodegen: () => runner.writeTypes(),
            onRefreshCommands: (shouldRefresh: boolean) => runner.refreshCommands(shouldRefresh),
            onReady: () => {
                runResult = runner
                    .run()
                    .finally(async () => {
                        // unmounting first loses the buffered lines
                        await LogStore.instance.flush();
                        unmount();
                    })
                    // node kills the process over an unwatched rejection
                    .catch((error: unknown) => {
                        failure = { error };
                    });
            }
        }),
        // the alternate screen restores the terminal and scrollback on quit, without ink's ESC[3J purge
        {
            exitOnCtrlC: false,
            // routeConsoleToLogs turns console calls into log records
            patchConsole: false,
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
