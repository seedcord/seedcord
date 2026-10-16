import { isPlainObject } from '@seedcord/utils/internal';

import type { StateFile, StateFolder } from '#core/state/StateFolder';
import type { DeployedHashes } from '@seedcord/types/internal';

function isStringRecord(value: unknown): value is Record<string, string> {
    return isPlainObject(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

export const deployedCommandsFile: StateFile<DeployedHashes | undefined> = {
    name: 'deployed-commands.json',
    defaults: undefined,
    parse: (raw) =>
        isPlainObject(raw) && typeof raw.applicationId === 'string' && isStringRecord(raw.scopes)
            ? { applicationId: raw.applicationId, scopes: raw.scopes }
            : undefined,
    serialize: (deployed) => deployed
};

export function lastDeployOf(state: Pick<StateFolder, 'read'>, applicationId: string): DeployedHashes | undefined {
    const deployed = state.read(deployedCommandsFile);
    return deployed?.applicationId === applicationId ? deployed : undefined;
}
