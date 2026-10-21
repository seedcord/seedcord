import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { loadInstance } from '#commands/commands/codeScopes';
import { DiscordSession } from '#commands/commands/DiscordSession';
import { defaultRunnerDeps } from '#commands/commands/runnerDeps';
import { commandCount } from '#commands/commands/scope';

import { deletedNote, scanNote } from './removeSteps';

import type { DiscordRest } from '#commands/commands/runnerDeps';
import type { GuildTargets } from '#commands/commands/scope';
import type { RemoveMode } from './RemoveMode';
import type { RemovePresenter } from './RemovePresenter';
import type { Selection } from './removeSteps';
import type { GuildSummary } from '@seedcord/core/internal';

interface RemovePlan {
    mode: RemoveMode;
    guilds: GuildTargets;
    // false prints what would go and deletes nothing
    apply: boolean;
}

export class RemoveRunner {
    private opened?: Promise<DiscordSession>;

    constructor(private readonly connect: () => Promise<DiscordRest>) {}

    public static create(): RemoveRunner {
        const deps = defaultRunnerDeps();
        return new RemoveRunner(async () => deps.openDiscord(await loadInstance(deps, process.cwd())));
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
        this.opened ??= this.connect().then((rest) => DiscordSession.open(rest));
        return this.opened;
    }
}
