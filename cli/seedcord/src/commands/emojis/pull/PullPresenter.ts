import { unlessCancelled } from '@seedcord/cli-prompts';
import { paint } from '@seedcord/errors';
import { displayPath } from '@seedcord/errors/internal';
import { posixRelative } from '@seedcord/utils/internal';

import { settleStep } from '#commands/emojis/outcome';
import { plural } from '#core/format';
import { markedRows, printSections } from '#core/output/printSections';
import { StepsPresenter } from '#core/output/StepsPresenter';

import type { Outcome } from '#commands/emojis/outcome';
import type { EmojiPrompts } from '#commands/emojis/prompts';
import type { PresenterOutput } from '#core/output/StepsPresenter';
import type { PullPlan, PullStep, Save } from './PullRunner';
import type { GuildSummary } from '@seedcord/core/internal';

export class PullPresenter extends StepsPresenter<PullStep> {
    constructor(
        output: PresenterOutput<PullStep>,
        private readonly prompts: Pick<EmojiPrompts, 'offer' | 'pickGuild'>
    ) {
        super(output);
    }

    // undefined when the bot isn't in a guild, or the picker was cancelled
    public async pickGuild(read: () => Promise<GuildSummary[]>): Promise<string | undefined> {
        const guilds = await this.output.step('read guilds', read, (found) => plural(found.length, 'guild'));
        if (guilds.length === 0) {
            this.output.line();
            this.output.line("The bot isn't in any guilds.");
            return undefined;
        }
        const choices = guilds.map(({ id, name }) => ({ value: id, label: name, hint: id }));
        return unlessCancelled(this.output, () => this.prompts.pickGuild(choices));
    }

    // undefined when the question was cancelled
    public offerOverwrite(inFolder: number): Promise<boolean | undefined> {
        return unlessCancelled(this.output, () =>
            this.prompts.offer(`Overwrite the ${inFolder === 1 ? 'one' : inFolder} you already have?`)
        );
    }

    public nothingToDownload({ folder, source }: PullPlan): void {
        this.output.line();
        this.output.line(
            `Nothing to download. ${paint.path(folder)} already has those emojis from ${paint.bold(source)}.`
        );
    }

    public preview({ folder, fresh, over, alreadyInFolder }: PullPlan): void {
        const files = (saves: readonly Save[]): string[] => saves.map(({ to }) => posixRelative(folder, to));
        const rows = [...markedRows('+', files(fresh)), ...markedRows('~', files(over))];
        if (alreadyInFolder > 0) rows.push({ items: [paint.mute(`${alreadyInFolder} already in the folder`)] });

        const downloads = plural(fresh.length + over.length, 'download');
        printSections(this.output, [{ title: displayPath(folder), note: downloads, rows }]);
    }

    public download(saves: readonly Save[], run: (save: Save) => Promise<void>): Promise<Outcome<Save>> {
        return settleStep(this.output, 'download', {
            items: saves,
            run,
            labelOf: ({ emoji }) => paint.bold(emoji.name)
        });
    }
}
