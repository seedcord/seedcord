import { isPlainObject } from '@seedcord/utils/internal';

import type { StateFile, StateFolder } from '#core/state/StateFolder';
import type { DeployedHashes } from '@seedcord/types/internal';

function isHashMap(value: unknown): value is Record<string, string> {
    return isPlainObject(value) && Object.values(value).every((hash) => typeof hash === 'string');
}

export const deployedCommandsFile: StateFile<DeployedHashes | undefined> = {
    name: 'deployed-commands.json',
    defaults: undefined,
    parse(raw) {
        if (!isPlainObject(raw) || typeof raw.applicationId !== 'string' || !isHashMap(raw.guilds)) return undefined;
        if (raw.global !== undefined && typeof raw.global !== 'string') return undefined;
        return { applicationId: raw.applicationId, global: raw.global, guilds: raw.guilds };
    },
    serialize: (deployed) => deployed
};

// a deploy for another application says nothing about this one
export function lastDeployOf(state: Pick<StateFolder, 'read'>, applicationId: string): DeployedHashes | undefined {
    const deployed = state.read(deployedCommandsFile);
    return deployed?.applicationId === applicationId ? deployed : undefined;
}
