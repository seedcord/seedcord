import { paint } from '@seedcord/errors';
import { displayPath } from '@seedcord/errors/internal';
import { posixRelative } from '@seedcord/utils/internal';

import { settleStep } from '#commands/emojis/outcome';
import { approved } from '#commands/emojis/prompts';
import { plural } from '#core/format';
import { markedRows, printSections } from '#core/output/printSections';
import { StepsPresenter } from '#core/output/StepsPresenter';

import type { Outcome } from '#commands/emojis/outcome';
import type { Confirm } from '#core/output/confirm';
import type { PresenterOutput } from '#core/output/StepsPresenter';
import type { PullPlan, PullStep, Save } from './PullRunner';

export class PullPresenter extends StepsPresenter<PullStep> {
    constructor(
        output: PresenterOutput<PullStep>,
        private readonly confirm: Confirm
    ) {
        super(output);
    }

    public nothingToDownload({ folder, source, alreadyInFolder }: PullPlan): void {
        this.output.line();
        this.output.line(
            `Nothing to download. ${paint.path(folder)} already has those emojis from ${paint.bold(source)}.`
        );
        if (alreadyInFolder > 0) this.output.line(paint.mute(`Pass ${paint.bold('--force')} to download them again.`));
    }

    public preview({ folder, fresh, over, alreadyInFolder }: PullPlan): void {
        const files = (saves: readonly Save[]): string[] => saves.map(({ to }) => posixRelative(folder, to));
        const rows = [...markedRows('+', files(fresh)), ...markedRows('~', files(over))];
        if (alreadyInFolder > 0) rows.push({ items: [paint.mute(`${alreadyInFolder} already in the folder`)] });

        const downloads = plural(fresh.length + over.length, 'download');
        printSections(this.output, [{ title: displayPath(folder), note: downloads, rows }]);
    }

    public approveOverwrite({ folder, source, over }: PullPlan): Promise<boolean> {
        return approved(
            this.output,
            this.confirm,
            `Overwrite ${plural(over.length, 'file')} in ${paint.path(folder)} with what's on ${paint.bold(source)}?`,
            'Nothing downloaded.'
        );
    }

    public download(saves: readonly Save[], run: (save: Save) => Promise<void>): Promise<Outcome<Save>> {
        return settleStep(this.output, 'download', {
            items: saves,
            run,
            labelOf: ({ emoji }) => paint.bold(emoji.name)
        });
    }
}
