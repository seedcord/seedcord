import { plural } from '#core/format';

import type { RemoveOps, RemoveResult, Scan } from './RemoveRunner';
import type { GuildTargets, ScopedCommands } from './scope';
import type { Snowflake } from 'discord-api-types/v10';

export interface EmptyMessage {
    info: string[];
    outro: string;
}

export abstract class RemoveMode {
    public abstract readonly noun: 'duplicate' | 'command';
    public abstract readonly includesGlobal: boolean;

    // throws when the targets give the scan nothing to read
    public abstract checkTargets(guilds: GuildTargets): void;

    public abstract select(scan: Scan): ScopedCommands[];

    public abstract remove(
        ops: RemoveOps,
        token: string,
        appId: Snowflake,
        selected: readonly ScopedCommands[]
    ): Promise<RemoveResult>;

    public nothingToRemove(scan: Scan): EmptyMessage {
        if (this.readNothing(scan)) {
            return {
                info: [],
                outro: `Could not read any of the ${plural(scan.skipped.length, 'guild')}, nothing was scanned.`
            };
        }
        return this.nothingSelected(scan);
    }

    protected abstract nothingSelected(scan: Scan): EmptyMessage;

    private readNothing(scan: Scan): boolean {
        return !this.includesGlobal && scan.guilds.length === 0 && scan.skipped.length > 0;
    }
}
