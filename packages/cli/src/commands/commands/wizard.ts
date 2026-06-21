import { plural } from '@core/format';
import { intro, log, outro, pickFromList, select, spinner } from '@core/prompts';

import { InteractivePresenter } from './cleanPresenters';
import { executeClean } from './executeClean';

import type { CleanRunner, CleanScope, GuildSummary } from './CleanRunner';

interface ScopePlan {
    scope: CleanScope;
    knownGuilds?: GuildSummary[];
}

export async function runCleanWizard(runner: CleanRunner, token: string): Promise<void> {
    intro('seedcord commands');

    const plan = await buildScope(runner, token);
    if (!plan) return;

    await executeClean({
        runner,
        scope: plan.scope,
        apply: true,
        token,
        presenter: new InteractivePresenter(),
        knownGuilds: plan.knownGuilds
    });
}

async function buildScope(runner: CleanRunner, token: string): Promise<ScopePlan | undefined> {
    const target = await select({
        message: 'Remove guild commands that duplicate a global command. Which guilds?',
        options: [
            { value: 'pick', label: 'Pick specific guilds' },
            {
                value: 'all',
                label: 'All guilds the bot is in',
                hint: 'duplicates only, pick specific guilds for a full reset'
            }
        ]
    });

    // a full purge needs named guilds, so all-guilds stays duplicates-only
    if (target === 'all') return { scope: { guildIds: [], allGuilds: true, purge: false } };

    const status = spinner();
    status.start('Fetching the guilds the bot is in...');
    let guilds: GuildSummary[];
    try {
        guilds = await runner.listBotGuilds(token);
    } catch (error) {
        status.stop('Could not fetch the guild list.');
        throw error;
    }
    status.stop(`Found ${plural(guilds.length, 'guild')}.`);

    if (guilds.length === 0) {
        outro('The bot is in no guilds.');
        return undefined;
    }

    let guildIds: string[];
    if (guilds.length > 1) {
        guildIds = await pickFromList({ message: 'Select guilds to clean', items: guilds });
        if (guildIds.length === 0) {
            outro('No guilds selected.');
            return undefined;
        }
    } else {
        const only = guilds[0];
        if (!only) return undefined;
        guildIds = [only.id];
        log.info(`Only one guild, using ${only.name}.`);
    }

    const mode = await select({
        message: 'What should I remove?',
        options: [
            { value: 'overlap', label: 'Only duplicates of a global command (recommended)' },
            { value: 'purge', label: 'Every command in these guilds (full reset)' }
        ]
    });

    return { scope: { guildIds, allGuilds: false, purge: mode === 'purge' }, knownGuilds: guilds };
}
