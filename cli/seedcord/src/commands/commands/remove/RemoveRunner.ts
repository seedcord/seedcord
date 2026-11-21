import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { DiscordSession } from '#commands/commands/DiscordSession';
import { commandCount } from '#commands/commands/scope';
import { defaultRunnerDeps } from '#core/discord/runnerDeps';
import { loadBot } from '#core/modules/loadBot';
import { quietSteps } from '#core/output/quietSteps';

import { deletedNote, scanNote } from './removeSteps';

import type { GuildTargets } from '#commands/commands/scope';
import type { RunnerDeps } from '#core/discord/runnerDeps';
import type { RemoveMode } from './RemoveMode';
import type { RemovePresenter } from './RemovePresenter';
import type { Selection } from './removeSteps';
import type { GuildSummary } from '@seedcord/core/internal';
import type { SeedcordInstance } from '@seedcord/types/internal';

export interface RemoveDeps extends Pick<RunnerDeps, 'openDiscord'> {
    readonly loadInstance: () => Promise<SeedcordInstance>;
}

interface RemovePlan {
    mode: RemoveMode;
    guilds: GuildTargets;
    // false prints what it would delete without deleting anything
    apply: boolean;
}

export class RemoveRunner {
    private opened?: Promise<DiscordSession>;

    constructor(private readonly deps: RemoveDeps) {}

    public static create(): RemoveRunner {
        const { openDiscord, projectLoader } = defaultRunnerDeps();
        return new RemoveRunner({
            openDiscord,
            loadInstance: () => loadBot(quietSteps, projectLoader, process.cwd()).then(({ instance }) => instance)
        });
    }

    public async listBotGuilds(): Promise<GuildSummary[]> {
        const session = await this.session();
        return session.guildsOf({ kind: 'all' });
    }

    public async run(presenter: RemovePresenter, { mode, guilds, apply }: RemovePlan): Promise<void> {
        mode.assertTargets(guilds);

        const { session, resolved } = await presenter.step('connect', async () => {
            const session = await this.session();
            return { session, resolved: await session.guildsOf(guilds) };
        });

        const { scan, selected } = await presenter.step(
            'scan',
            async (): Promise<Selection> => {
                const scan = await session.readScopes(resolved);
                return { scan, selected: mode.select(scan) };
            },
            (selection) => scanNote(mode, selection)
        );

        const count = commandCount(selected);
        if (count === 0) {
            presenter.nothing(mode.nothingToRemove(scan));
            return;
        }

        presenter.preview(selected, mode.itemName);
        if (!apply) {
            presenter.dryRunHint();
            return;
        }
        if (!(await presenter.confirmDelete(count))) return;

        const result = await presenter.step('delete', () => mode.remove(session, selected), deletedNote);
        presenter.result(
            result,
            selected.some(({ scope }) => scope.kind === 'global')
        );
        if (result.failed.length > 0) throw new SeedcordError(SeedcordErrorCode.CliCommandsNotDeleted);
    }

    // the wizard's guild list and the run share one session
    private session(): Promise<DiscordSession> {
        this.opened ??= this.deps
            .loadInstance()
            .then((instance) => DiscordSession.open(this.deps.openDiscord(instance)));
        return this.opened;
    }
}
