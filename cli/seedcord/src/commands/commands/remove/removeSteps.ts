import { paint } from '@seedcord/errors';

import { commandCount } from '#commands/commands/scope';
import { plural } from '#core/format';

import type { RemoveResult, Scan } from '#commands/commands/DiscordSession';
import type { ScopedCommands } from '#commands/commands/scope';
import type { RemoveMode } from './RemoveMode';

export const REMOVE_STEPS = ['connect', 'scan', 'delete'] as const;

export type RemoveStep = (typeof REMOVE_STEPS)[number];

function scannedWhere(includesGlobal: boolean, guildCount: number): string {
    const guilds = paint.iris(plural(guildCount, 'guild'));
    if (!includesGlobal) return `in ${guilds}`;
    return guildCount === 0 ? 'globally' : `globally and in ${guilds}`;
}

export interface Selection {
    scan: Scan;
    selected: ScopedCommands[];
}

export function scanNote(mode: RemoveMode, { scan, selected }: Selection): string {
    const found = paint.iris(plural(commandCount(selected), mode.itemName));
    return `${found} ${scannedWhere(mode.includesGlobal, scan.guilds.length)}`;
}

export function deletedNote(result: RemoveResult): string {
    return `${paint.iris(String(result.deleted))} deleted`;
}
