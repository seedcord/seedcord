import { rm } from 'node:fs/promises';

import { compact } from 'es-toolkit';

import { namedOnDiscord, onDiscord } from '#commands/emojis/emojiDiff';
import { assertNoneFailed } from '#commands/emojis/outcome';
import { EMOJI_STEPS, readEmojis } from '#commands/emojis/readEmojis';
import { defaultRunnerDeps } from '#core/discord/runnerDeps';

import type { OnDiscord } from '#commands/emojis/emojiDiff';
import type { RunnerDeps } from '#core/discord/runnerDeps';
import type { RemovePresenter } from './RemovePresenter';

export const REMOVE_STEPS = [...EMOJI_STEPS, 'delete'] as const;
export type RemoveStep = (typeof REMOVE_STEPS)[number];

export interface RemoveOptions {
    // an empty list opens the picker
    readonly names: readonly string[];
    // if it's not set, remove asks in a terminal and keeps the files everywhere else
    readonly deleteFile?: boolean | undefined;
}

export interface RemovePlan {
    folder: string;
    source: string;
    removals: OnDiscord[];
    // the files that belong to the picked emojis
    files: string[];
    deleteFiles: boolean;
}

export class RemoveRunner {
    constructor(private readonly deps: RunnerDeps) {}

    public static create(): RemoveRunner {
        return new RemoveRunner(defaultRunnerDeps());
    }

    public async run(presenter: RemovePresenter, { names, deleteFile = false }: RemoveOptions): Promise<void> {
        const { folder, session, source, diff } = await readEmojis(presenter, this.deps, process.cwd());

        const picked = names.length > 0 ? names : await presenter.pick(onDiscord(diff));
        if (picked === undefined) return;
        const removals = namedOnDiscord(diff, picked, source);
        if (removals.length === 0) {
            presenter.nothingToDelete();
            return;
        }

        const files = compact(removals.map(({ file }) => file?.file));
        const deleteFiles = deleteFile || (files.length > 0 && (await presenter.offerFiles(folder, files)));
        if (deleteFiles === undefined) return;

        const plan = { folder, source, removals, files, deleteFiles };
        presenter.preview(plan);
        if (!(await presenter.approve(plan))) return;

        const outcome = await presenter.delete(removals, async ({ emoji, file }) => {
            await session.delete(emoji);
            if (file && deleteFiles) await rm(file.file);
        });
        assertNoneFailed(outcome, 'delete');
    }
}
