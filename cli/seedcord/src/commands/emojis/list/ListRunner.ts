import { emojiNotFound } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { throwSingleOrAggregate } from '@seedcord/errors/internal';

import { readEmojis } from '#commands/emojis/readEmojis';
import { defaultRunnerDeps } from '#core/discord/runnerDeps';

import { listingJson } from './listingJson';

import type { EmojiState, EmojiStep } from '#commands/emojis/readEmojis';
import type { RunnerDeps } from '#core/discord/runnerDeps';
import type { Steps } from '#core/output/Steps';
import type { ListPresenter } from './ListPresenter';

export interface ListOptions {
    readonly check?: boolean | undefined;
}

export class ListRunner {
    constructor(private readonly deps: RunnerDeps) {}

    public static create(): ListRunner {
        return new ListRunner(defaultRunnerDeps());
    }

    public async run(presenter: ListPresenter, options: ListOptions): Promise<void> {
        const state = await this.read(presenter);
        presenter.list(state);
        this.check(state, options);
    }

    public async json(steps: Steps<EmojiStep>, options: ListOptions): Promise<ReturnType<typeof listingJson>> {
        const state = await this.read(steps);
        this.check(state, options);
        return listingJson(state);
    }

    private read(steps: Steps<EmojiStep>): Promise<EmojiState> {
        return readEmojis(steps, this.deps, process.cwd());
    }

    // same error dev and build throw for a missing emoji
    private check({ diff }: EmojiState, { check = false }: ListOptions): void {
        if (!check) return;
        throwSingleOrAggregate(
            diff.missing.map(({ key, name }) => emojiNotFound({ kind: 'folder', key, name })),
            SeedcordErrorCode.ConfigEmojiUnresolved
        );
    }
}
