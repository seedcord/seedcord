import { paint } from '@seedcord/errors';
import { displayPath } from '@seedcord/errors/internal';
import { partition } from 'es-toolkit';

import { settleStep } from '#commands/emojis/outcome';
import { approved, picked } from '#commands/emojis/prompts';
import { plural } from '#core/format';
import { printEdgeHint } from '#core/output/printEdgeHint';
import { markedRows, printSections } from '#core/output/printSections';
import { StepsPresenter } from '#core/output/StepsPresenter';

import type { UploadedFile } from '#commands/emojis/emojiDiff';
import type { Outcome } from '#commands/emojis/outcome';
import type { EmojiPrompts } from '#commands/emojis/prompts';
import type { Section, SectionRow } from '#core/output/printSections';
import type { PresenterOutput } from '#core/output/StepsPresenter';
import type { PushPlan, PushStep, Upload } from './PushRunner';

const emojis = (count: number): string => plural(count, 'emoji');

function question({ add, replace, source }: PushPlan): string {
    const app = paint.bold(source);
    if (replace.length === 0) return `Upload ${emojis(add.length)} to ${app}?`;
    const newId = replace.length === 1 ? 'It gets a new id.' : 'Each one gets a new id.';
    if (add.length === 0) return `Replace ${emojis(replace.length)} on ${app}? ${newId}`;
    return `Upload ${emojis(add.length)} to ${app} and replace ${replace.length}? ${newId}`;
}

export class PushPresenter extends StepsPresenter<PushStep> {
    constructor(
        output: PresenterOutput<PushStep>,
        private readonly prompts: Pick<EmojiPrompts, 'confirm' | 'pick'>,
        private readonly verbose: boolean
    ) {
        super(output);
    }

    public pickReplacements(uploaded: readonly UploadedFile[]): Promise<string[] | undefined> {
        const choices = uploaded.map(({ file }) => ({ value: file.name, label: file.name }));
        return picked(this.output, this.prompts.pick, choices);
    }

    public nothingToUpload({ folder, source, keep }: PushPlan): void {
        this.output.line();
        this.output.line(
            keep.length === 0
                ? `Nothing to upload. ${paint.path(folder)} doesn't have any emojis in it.`
                : `Nothing to upload. ${paint.bold(source)} has all ${emojis(keep.length)} from ${paint.path(folder)}.`
        );
    }

    public preview({ folder, add, replace, keep, onlyOnDiscord }: PushPlan): void {
        const rows: SectionRow[] = [
            ...markedRows(
                '+',
                add.map(({ name }) => name)
            ),
            ...markedRows(
                '~',
                replace.map(({ file }) => file.name)
            )
        ];
        if (keep.length > 0) {
            rows.push({
                items: this.verbose
                    ? keep.map(({ file }) => file.name)
                    : [paint.mute(`${keep.length} already uploaded`)]
            });
        }

        const inFolder = add.length + replace.length + keep.length;
        const sections: Section[] = [{ title: displayPath(folder), note: emojis(inFolder), rows }];
        if (onlyOnDiscord.length > 0) {
            sections.push({
                title: 'only on Discord',
                note: `${emojis(onlyOnDiscord.length)}, kept`,
                rows: [{ items: onlyOnDiscord.map(({ name }) => name) }]
            });
        }
        printSections(this.output, sections);
    }

    public approve(plan: PushPlan): Promise<boolean> {
        return approved(this.output, this.prompts.confirm, question(plan), 'Nothing uploaded.');
    }

    public upload(
        uploads: readonly Upload[],
        run: (upload: Upload) => Promise<void>,
        reasonOf: (error: unknown) => string
    ): Promise<Outcome<Upload>> {
        return settleStep(this.output, 'upload', {
            items: uploads,
            run,
            reasonOf,
            labelOf: ({ file }) => paint.path(file.file),
            counts: (done) => {
                const [replaced, added] = partition(done, ({ emoji }) => emoji !== undefined);
                return [
                    [added.length, 'uploaded'],
                    [replaced.length, 'replaced']
                ];
            }
        });
    }

    public edgeHint(): void {
        printEdgeHint(this.output, 'the emojis this push uploaded');
    }
}
