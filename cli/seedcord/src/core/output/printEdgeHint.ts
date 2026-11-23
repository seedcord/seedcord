import { paint } from '@seedcord/errors';

import type { StepPrinter } from '#core/output/StepPrinter';

export function printEdgeHint(output: Pick<StepPrinter<string>, 'line'>, added: string): void {
    output.line();
    output.line(paint.mute(`Your edge worker doesn't have ids for ${added}.`));
    output.line(paint.mute(`Run ${paint.bold('seedcord build')} and deploy the worker again to pick them up.`));
}
