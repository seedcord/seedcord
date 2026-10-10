import type { LinkedCommands } from '#src/commands/linkCommands';
import type { ResolvedEmoji } from '#src/miscellaneous/ResolvedEmoji';

export const BAKED_IDS_KEY = 'seedcord:core:baked-ids';

export interface BakedIds {
    readonly publicKey: string;
    readonly emojis: Readonly<Record<string, Pick<ResolvedEmoji, 'name' | 'id' | 'animated'>>>;
    readonly commands: LinkedCommands['commands'];
    readonly contextMenus: LinkedCommands['contextMenus'];
}
