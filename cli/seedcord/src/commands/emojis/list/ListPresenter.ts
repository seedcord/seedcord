import { paint } from '@seedcord/errors';

import { plural } from '#core/format';
import { itemRows, printSections } from '#core/output/printSections';
import { StepsPresenter } from '#core/output/StepsPresenter';

import type { EmojiState, EmojiStep } from '#commands/emojis/readEmojis';
import type { Section } from '#core/output/printSections';
import type { PresenterOutput } from '#core/output/StepsPresenter';

type Rows = [listed: Parameters<typeof itemRows>[0], mark?: Parameters<typeof itemRows>[2]];

// a key that starts with a digit can't follow a dot
const accessOf = (key: string): string => (/^\d/u.test(key) ? `Emojis['${key}']` : `Emojis.${key}`);

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

    private section(title: string, ...[listed, mark]: Rows): Section {
        return { title, note: plural(listed.length, 'emoji'), rows: itemRows(listed, this.verbose, mark) };
    }
}
