import { unlessCancelled } from '@seedcord/cli-prompts';
import { paint } from '@seedcord/errors';
import { displayPath } from '@seedcord/errors/internal';
import { posixRelative } from '@seedcord/utils/internal';

import { settleStep } from '#commands/emojis/outcome';
import { approved, picked } from '#commands/emojis/prompts';
import { plural } from '#core/format';
import { markedRows, printSections } from '#core/output/printSections';
import { StepsPresenter } from '#core/output/StepsPresenter';

import type { OnDiscord } from '#commands/emojis/emojiDiff';
import type { Outcome } from '#commands/emojis/outcome';
import type { EmojiPrompts } from '#commands/emojis/prompts';
import type { Section } from '#core/output/printSections';
import type { PresenterOutput } from '#core/output/StepsPresenter';
import type { RemovePlan, RemoveStep } from './RemoveRunner';

const files = (count: number): string => plural(count, 'file');

export class RemovePresenter extends StepsPresenter<RemoveStep> {
    constructor(
        output: PresenterOutput<RemoveStep>,
        private readonly prompts: Pick<EmojiPrompts, 'confirm' | 'offer' | 'pick'>
    ) {
        super(output);
    }

    public pick(removable: readonly OnDiscord[]): Promise<string[] | undefined> {
        const choices = removable.map(({ emoji, file }) => {
            const choice = { value: emoji.name, label: emoji.name };
            return file ? { ...choice, hint: displayPath(file.file) } : choice;
        });
        return picked(this.output, this.prompts.pick, choices);
    }

    // undefined when the question was cancelled
    public offerFiles(folder: string, withFiles: readonly string[]): Promise<boolean | undefined> {
        return unlessCancelled(this.output, () =>
            this.prompts.offer(`Delete ${files(withFiles.length)} from ${paint.path(folder)} too?`)
        );
    }

    public nothingToDelete(): void {
        this.output.line();
        this.output.line('Nothing to delete.');
    }

    public preview(plan: RemovePlan): void {
        const { folder, source, removals, deleteFiles } = plan;
        const sections: Section[] = [
            {
                title: source,
                note: plural(removals.length, 'emoji'),
                rows: markedRows(
                    '-',
                    removals.map(({ emoji }) => emoji.name)
                )
            }
        ];
        if (deleteFiles) {
            sections.push({
                title: displayPath(folder),
                note: files(plan.files.length),
                rows: markedRows(
                    '-',
                    plan.files.map((file) => posixRelative(folder, file))
                )
            });
        }
        printSections(this.output, sections);

        if (deleteFiles || plan.files.length === 0) return;
        const kept = plan.files.length;
        const push = paint.bold('seedcord emojis push');
        this.output.line(
            paint.mute(
                `Keeping ${files(kept)} in ${paint.path(folder)}, so the next ${push} uploads ${kept === 1 ? 'it' : 'them'} again.`
            )
        );
    }

    public approve({ folder, source, removals, files: withFiles, deleteFiles }: RemovePlan): Promise<boolean> {
        const andFiles = deleteFiles ? ` and ${files(withFiles.length)} from ${paint.path(folder)}` : '';
        return approved(
            this.output,
            this.prompts.confirm,
            `Delete ${plural(removals.length, 'emoji')} from ${paint.bold(source)}${andFiles}?`,
            'Nothing deleted.'
        );
    }

    public delete(
        removals: readonly OnDiscord[],
        run: (removal: OnDiscord) => Promise<void>
    ): Promise<Outcome<OnDiscord>> {
        return settleStep(this.output, 'delete', {
            items: removals,
            run,
            labelOf: ({ emoji }) => paint.bold(emoji.name)
        });
    }
}
