import { unlessCancelled } from '@seedcord/cli-prompts';
import { paint } from '@seedcord/errors';
import { displayPath } from '@seedcord/errors/internal';

import { plural } from '#core/format';
import { printEdgeHint } from '#core/output/printEdgeHint';
import { printSections } from '#core/output/printSections';
import { StepsPresenter } from '#core/output/StepsPresenter';

import type { UploadedFile } from '#commands/emojis/emojiDiff';
import type { Confirm } from '#core/output/confirm';
import type { Section, SectionRow } from '#core/output/printSections';
import type { PresenterOutput } from '#core/output/StepsPresenter';
import type { PushPlan, PushResult, PushStep } from './PushRunner';

export interface PushPrompts {
    confirm: Confirm;
    pick: (names: readonly string[]) => Promise<string[]>;
}

const emojis = (count: number): string => plural(count, 'emoji');

function question({ add, replace, app }: PushPlan): string {
    const where = paint.bold(app);
    if (replace.length === 0) return `Upload ${emojis(add.length)} to ${where}?`;
    const newId = replace.length === 1 ? 'It gets a new id.' : 'Each one gets a new id.';
    if (add.length === 0) return `Replace ${emojis(replace.length)} on ${where}? ${newId}`;
    return `Upload ${emojis(add.length)} to ${where} and replace ${replace.length}? ${newId}`;
}

function uploadNote({ added, replaced, failed }: PushResult): string {
    const parts: string[] = [];
    if (added > 0) parts.push(`${paint.iris(String(added))} uploaded`);
    if (replaced > 0) parts.push(`${paint.iris(String(replaced))} replaced`);
    if (failed.length > 0) parts.push(paint.coral(`${failed.length} failed`));
    return parts.join(', ');
}

export class PushPresenter extends StepsPresenter<PushStep> {
    constructor(
        output: PresenterOutput<PushStep>,
        private readonly prompts: PushPrompts,
        private readonly verbose: boolean
    ) {
        super(output);
    }

    // undefined when the picker was cancelled
    public async pickReplacements(uploaded: readonly UploadedFile[]): Promise<string[] | undefined> {
        if (uploaded.length === 0) return [];
        return unlessCancelled(this.output, () => this.prompts.pick(uploaded.map(({ file }) => file.name)));
    }

    public nothingToUpload({ folder, app, keep }: PushPlan): void {
        this.output.line();
        this.output.line(
            keep.length === 0
                ? `Nothing to upload. ${paint.path(folder)} doesn't have any emojis in it.`
                : `Nothing to upload. ${paint.bold(app)} has all ${emojis(keep.length)} from ${paint.path(folder)}.`
        );
    }

    public preview(plan: PushPlan): void {
        const { folder, add, replace, keep, onlyOnDiscord } = plan;
        const inFolder = add.length + replace.length + keep.length;
        const sections: Section[] = [{ title: displayPath(folder), note: emojis(inFolder), rows: this.rows(plan) }];
        if (onlyOnDiscord.length > 0) {
            sections.push({
                title: 'only on Discord',
                note: `${emojis(onlyOnDiscord.length)}, kept`,
                rows: [{ items: onlyOnDiscord.map(({ name }) => name) }]
            });
        }
        printSections(this.output, sections);
    }

    public async approve(plan: PushPlan): Promise<boolean> {
        const yes = await unlessCancelled(this.output, () => this.prompts.confirm(question(plan)));
        if (yes === false) this.output.line(paint.mute('Nothing uploaded.'));
        return yes === true;
    }

    public upload(task: () => Promise<PushResult>): Promise<PushResult> {
        return this.output.step('upload', task, uploadNote);
    }

    public result({ added, replaced, failed }: PushResult, edge: boolean): void {
        if (failed.length > 0) this.output.line();
        for (const { file, reason } of failed) this.output.warn(`Could not upload ${paint.path(file)} (${reason}).`);
        if (edge && added + replaced > 0) printEdgeHint(this.output, 'the emojis this push uploaded');
    }

    private rows({ add, replace, keep }: PushPlan): SectionRow[] {
        const rows: SectionRow[] = [];
        if (add.length > 0) {
            rows.push({ marker: paint.mint.bold('+'), items: add.map(({ name }) => paint.mint(name)) });
        }
        if (replace.length > 0) {
            rows.push({ marker: paint.iris.bold('~'), items: replace.map(({ file }) => paint.iris(file.name)) });
        }
        if (keep.length > 0) {
            rows.push({
                items: this.verbose
                    ? keep.map(({ file }) => file.name)
                    : [paint.mute(`${keep.length} already uploaded`)]
            });
        }
        return rows;
    }
}
