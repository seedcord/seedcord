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

    public abstract nothingToRemove(scan: Scan): EmptyMessage;
}
