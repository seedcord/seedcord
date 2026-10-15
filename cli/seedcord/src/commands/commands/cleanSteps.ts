import { paint } from '@seedcord/errors';

import { plural } from '#core/format';

import type { DeleteResult, ResolvedTargets, ScanResult } from './CleanRunner';

export const CLEAN_STEP_LABELS = ['connect', 'scan', 'delete'] as const;

export type CleanStepLabel = (typeof CLEAN_STEP_LABELS)[number];

export interface CleanStep<Result> {
    readonly label: CleanStepLabel;
    readonly startMessage: string;
    readonly doneNote: (result: Result) => string;
}

export function connectStep(): CleanStep<ResolvedTargets> {
    return { label: 'connect', startMessage: 'Connecting to Discord…', doneNote: () => '' };
}

export function scanStep(guildCount: number, purge: boolean): CleanStep<ScanResult> {
    return {
        label: 'scan',
        startMessage: `Scanning ${plural(guildCount, 'guild')} for commands…`,
        doneNote: (scan) => {
            const found = plural(scan.flagged.length, purge ? 'command' : 'duplicate');
            return `${paint.iris(found)} in ${paint.iris(plural(scan.scannedGuildCount, 'guild'))}`;
        }
    };
}

export function deleteStep(commandCount: number): CleanStep<DeleteResult> {
    return {
        label: 'delete',
        startMessage: `Deleting ${plural(commandCount, 'guild command')}…`,
        doneNote: (deletion) => `${paint.iris(String(deletion.deleted))} deleted`
    };
}
