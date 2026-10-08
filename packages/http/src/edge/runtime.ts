import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { EdgeSweeperKey } from '#interfaces/Config';
import type { RESTOptions } from '@discordjs/rest';
import type { CoordinatedShutdown } from '@seedcord/core/node';

function noLifecycle(accessor: string): never {
    throw new SeedcordError(SeedcordErrorCode.CoreLifecycleUnavailable, [accessor]);
}

export const edgeShutdown: Pick<CoordinatedShutdown, 'addTask'> = { addTask: () => noLifecycle('shutdown') };

// @discordjs/rest skips a sweeper set to 0
const EDGE_SWEEPERS: Record<EdgeSweeperKey, 0> = { hashSweepInterval: 0, handlerSweepInterval: 0 };

export function edgeRestOptions(given: Partial<RESTOptions> = {}): Partial<RESTOptions> {
    for (const key of Object.keys(EDGE_SWEEPERS) as EdgeSweeperKey[]) {
        if (given[key] !== undefined) throw new SeedcordError(SeedcordErrorCode.ConfigEdgeRestSweeper, [key]);
    }
    return { ...given, ...EDGE_SWEEPERS };
}
