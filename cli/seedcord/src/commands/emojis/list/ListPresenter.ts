import { paint } from '@seedcord/errors';

import { renderKey } from '#commands/codegen/renderAugmentation';
import { plural } from '#core/format';
import { itemRows, printSections } from '#core/output/printSections';
import { StepsPresenter } from '#core/output/StepsPresenter';

import type { EmojiState, EmojiStep } from '#commands/emojis/readEmojis';
import type { Mark, RowItem, Section } from '#core/output/printSections';
import type { PresenterOutput } from '#core/output/StepsPresenter';

// the same quoting that codegen writes into EmojiMap
function accessOf(key: string): string {
    const rendered = renderKey(key);
    return rendered === key ? `Emojis.${key}` : `Emojis[${rendered}]`;
}

export class ListPresenter extends StepsPresenter<EmojiStep> {
    constructor(
        output: PresenterOutput<EmojiStep>,
        private readonly verbose: boolean
    ) {
        super(output);
    }

    public list({ diff }: EmojiState): void {
        const { uploaded, missing, onlyOnDiscord } = diff;
        const sections = [
            this.section(
                'uploaded',
                uploaded.map(({ file, emoji }) => ({ label: file.name, detail: `${accessOf(file.key)}  ${emoji.id}` }))
            ),
            this.section(
                'not uploaded',
                missing.map(({ name, key }) => ({ label: name, detail: accessOf(key) })),
                '+'
            )
        ];
        if (onlyOnDiscord.length > 0) {
            sections.push(
                this.section(
                    'only on Discord',
                    onlyOnDiscord.map(({ name, id }) => ({ label: name, detail: id }))
                )
            );
        }
        printSections(this.output, sections);

        if (missing.length === 0) return;
        const push = paint.bold('seedcord emojis push');
        this.output.line(paint.mute(`Run ${push} to upload the ${missing.length} that are missing.`));
    }

    private section(title: string, listed: readonly RowItem[], mark?: Mark): Section {
        return { title, note: plural(listed.length, 'emoji'), rows: itemRows(listed, this.verbose, mark) };
    }
}
