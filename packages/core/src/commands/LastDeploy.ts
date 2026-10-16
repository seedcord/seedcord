import { unlessAborted } from '@seedcord/utils/internal';

import { getDevChannel } from '#hmr/devChannel';

import type { DeployedHashes, SeedcordCliEvents } from '@seedcord/types/internal';

// seedcord dev answers from one small file
// something has really gone wrong if this times out
const ANSWER_TIMEOUT_MS = 5000;

export class LastDeploy {
    private saved?: Promise<DeployedHashes | undefined>;

    public read(applicationId: string, signal: AbortSignal | undefined): Promise<DeployedHashes | undefined> {
        this.saved ??= askSeedcordDev(applicationId);
        return unlessAborted(this.saved, signal);
    }

    public save(deployed: DeployedHashes): void {
        this.saved = Promise.resolve(deployed);
        getDevChannel()?.send('seedcord:commands-deployed', deployed);
    }
}

function askSeedcordDev(applicationId: string): Promise<DeployedHashes | undefined> {
    const cli = getDevChannel();
    if (!cli) return Promise.resolve(undefined);
    const { promise, resolve } = Promise.withResolvers<DeployedHashes | undefined>();
    const settle = (deployed: DeployedHashes | undefined): void => {
        clearTimeout(timer);
        cli.off('seedcord:last-deploy', onAnswer);
        resolve(deployed);
    };
    const onAnswer = ({ deployed }: SeedcordCliEvents['seedcord:last-deploy']): void => settle(deployed);
    const timer = setTimeout(() => settle(undefined), ANSWER_TIMEOUT_MS);
    cli.on('seedcord:last-deploy', onAnswer);
    cli.send('seedcord:read-deployed', { applicationId });
    return promise;
}
