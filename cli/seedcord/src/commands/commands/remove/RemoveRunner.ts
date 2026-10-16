import { DiscordSession } from '#commands/commands/DiscordSession';
import { defaultRunnerDeps } from '#commands/commands/runnerDeps';
import { commandCount } from '#commands/commands/scope';
import { GUILD_PAGE, readBotGuilds } from '#core/discord/readBotGuilds';

import { deletedNote, scanNote } from './removeSteps';

import type { RunnerDeps } from '#commands/commands/runnerDeps';
import type { GuildTargets } from '#commands/commands/scope';
import type { GuildSummary } from '#core/discord/readBotGuilds';
import type { RemoveMode } from './RemoveMode';
import type { RemovePresenter } from './RemovePresenter';
import type { Selection } from './removeSteps';

export interface RemovePlan {
    mode: RemoveMode;
    guilds: GuildTargets;
    // false prints what would go and deletes nothing
    apply: boolean;
}

export class RemoveRunner {
    constructor(private readonly deps: Pick<RunnerDeps, 'openDiscord'>) {}

    public static create(): RemoveRunner {
        return new RemoveRunner(defaultRunnerDeps());
    }

    public listBotGuilds(): Promise<GuildSummary[]> {
        return readBotGuilds(this.deps.openDiscord());
    }

    public async run(presenter: RemovePresenter, { mode, guilds, apply }: RemovePlan): Promise<void> {
        mode.checkTargets(guilds);

        const { session, resolved } = await presenter.step('connect', async () => {
            const session = await DiscordSession.open(this.deps.openDiscord());
            return { session, resolved: await session.guildsOf(guilds) };
        });

        // past one page of guilds, the scan's request per guild adds up
        if (guilds.kind === 'all' && resolved.length > GUILD_PAGE && !(await presenter.largeBotGuard(resolved.length)))
            return;

        const { scan, selected } = await presenter.step(
            'scan',
            async (): Promise<Selection> => {
                const scan = await session.readScopes(resolved);
                return { scan, selected: mode.select(scan) };
            },
            (selection) => scanNote(mode, selection)
        );
        presenter.skipped(scan.skipped);

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
        if (!(await presenter.confirmDelete(count, scan.skipped.length))) return;

        const result = await presenter.step('delete', () => mode.remove(session, selected), deletedNote);
        presenter.result(
            result,
            selected.some(({ scope }) => scope.kind === 'global')
        );
    }
}
