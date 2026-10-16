import { paint } from '@seedcord/errors';

import { plural } from '#core/format';

import { commandCount } from './scope';

import type { RemoveMode } from './RemoveMode';
import type { Connected, RemoveResult, Scan } from './RemoveRunner';

export const REMOVE_STEPS = ['connect', 'scan', 'delete'] as const;

export type RemoveStepLabel = (typeof REMOVE_STEPS)[number];

export interface RemoveStep<Result> {
    readonly label: RemoveStepLabel;
    readonly doneNote: (result: Result) => string;
}

function scannedWhere(includesGlobal: boolean, guildCount: number): string {
    const guilds = paint.iris(plural(guildCount, 'guild'));
    if (!includesGlobal) return guilds;
    return guildCount === 0 ? 'global' : `global and ${guilds}`;
}

export function connectStep(): RemoveStep<Connected> {
    return { label: 'connect', doneNote: () => '' };
}

export function scanStep(mode: RemoveMode): RemoveStep<Scan> {
    return {
        label: 'scan',
        doneNote: (scan) => {
            const found = paint.iris(plural(commandCount(mode.select(scan)), mode.noun));
            return `${found} in ${scannedWhere(mode.includesGlobal, scan.guilds.length)}`;
        }
    };
}

export function deleteStep(): RemoveStep<RemoveResult> {
    return { label: 'delete', doneNote: (result) => `${paint.iris(String(result.deleted))} deleted` };
}
