import { paint } from '@seedcord/errors';

import { plural } from '#core/format';

import type { DeleteResult, ResolvedTargets, ScanResult } from './CleanRunner';

export const CLEAN_STEP_LABELS = ['connect', 'scan', 'delete'] as const;

export interface CleanStep<Result> {
    readonly label: (typeof CLEAN_STEP_LABELS)[number];
    // the flag path logs this before the step runs
    readonly start: string;
    // the wizard prints this after the step's time
    readonly note: (result: Result) => string;
}

export function connectStep(): CleanStep<ResolvedTargets> {
    return { label: 'connect', start: 'Connecting to Discord…', note: () => '' };
}

export function scanStep(guildCount: number, purge: boolean): CleanStep<ScanResult> {
    return {
        label: 'scan',
        start: `Scanning ${plural(guildCount, 'guild')} for commands…`,
        note: (scan) => {
            const found = plural(scan.flagged.length, purge ? 'command' : 'duplicate');
            return `${paint.iris(found)} in ${paint.iris(plural(scan.scannedGuildCount, 'guild'))}`;
        }
    };
}

export function deleteStep(commandCount: number): CleanStep<DeleteResult> {
    return {
        label: 'delete',
        start: `Deleting ${plural(commandCount, 'guild command')}…`,
        note: (deletion) => `${paint.iris(String(deletion.deleted))} deleted`
    };
}
