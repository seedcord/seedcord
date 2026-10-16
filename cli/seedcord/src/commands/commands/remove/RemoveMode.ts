import type { DiscordSession, RemoveResult, Scan } from '#commands/commands/DiscordSession';
import type { GuildTargets, ScopedCommands } from '#commands/commands/scope';

export interface EmptyMessage {
    info: string[];
    outro: string;
}

export abstract class RemoveMode {
    // the word the output uses for one selected command
    public abstract readonly itemName: string;
    public abstract readonly includesGlobal: boolean;

    public abstract assertTargets(guilds: GuildTargets): void;

    public abstract select(scan: Scan): ScopedCommands[];

    public abstract remove(session: DiscordSession, selected: readonly ScopedCommands[]): Promise<RemoveResult>;

    public nothingToRemove(scan: Scan): EmptyMessage {
        if (this.readNothing(scan)) return { info: [], outro: 'Nothing was scanned.' };
        return this.nothingSelected(scan);
    }

    protected abstract nothingSelected(scan: Scan): EmptyMessage;

    private readNothing(scan: Scan): boolean {
        return !this.includesGlobal && scan.guilds.length === 0 && scan.skipped.length > 0;
    }
}
