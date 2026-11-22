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

export class RemovePresenter extends StepsPresenter<RemoveStep> {
    constructor(
        output: PresenterOutput<RemoveStep>,
        private readonly prompts: EmojiPrompts
    ) {
        super(output);
    }

    public pick(removable: readonly OnDiscord[], deleteFile: boolean): Promise<string[] | undefined> {
        const choices = removable.map(({ emoji, file }) => {
            const choice = { value: emoji.name, label: emoji.name };
            if (!file) return choice;
            return {
                ...choice,
                hint: deleteFile ? `and ${displayPath(file.file)}` : 'has a file, needs --delete-file'
            };
        });
        return picked(this.output, this.prompts.pick, choices);
    }

    public nothingToDelete(): void {
        this.output.line();
        this.output.line('Nothing to delete.');
    }

    public preview({ folder, source, removals, files }: RemovePlan): void {
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
        if (files.length > 0) {
            sections.push({
                title: displayPath(folder),
                note: plural(files.length, 'file'),
                rows: markedRows(
                    '-',
                    files.map((file) => posixRelative(folder, file))
                )
            });
        }
        printSections(this.output, sections);
    }

    public approve({ folder, source, removals, files }: RemovePlan): Promise<boolean> {
        const andFiles = files.length > 0 ? ` and ${plural(files.length, 'file')} from ${paint.path(folder)}` : '';
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
