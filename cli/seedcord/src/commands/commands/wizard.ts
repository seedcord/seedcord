import { isSeedcordError, paint, SeedcordErrorCode } from '@seedcord/errors';

import { plural } from '#core/format';

import { InteractivePresenter } from './cleanPresenters';
import { executeClean } from './executeClean';

import type { StepPrinter } from '#core/output/StepPrinter';
import type { Prompter } from '#core/prompts/Prompter';
import type { CleanRunner, CleanScope, GuildSummary } from './CleanRunner';

export const WIZARD_STEPS = ['guilds', 'connect', 'scan', 'delete'] as const;
type WizardStep = (typeof WIZARD_STEPS)[number];

interface ScopePlan {
    scope: CleanScope;
    knownGuilds?: GuildSummary[];
}

interface Wizard {
    runner: CleanRunner;
    token: string;
    printer: StepPrinter<WizardStep>;
    prompter: Prompter;
}

export async function runCleanWizard(
    runner: CleanRunner,
    token: string,
    printer: StepPrinter<WizardStep>,
    prompter: Prompter
): Promise<void> {
    try {
        const plan = await buildScope({ runner, token, printer, prompter });
        if (!plan) return;

        await executeClean({
            runner,
            scope: plan.scope,
            apply: true,
            token,
            presenter: new InteractivePresenter(printer, prompter, plan.scope.purge),
            knownGuilds: plan.knownGuilds
        });
    } catch (error: unknown) {
        if (!isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.CliCancelled)) throw error;
        printer.line(paint.mute('cancelled'));
    }
}

async function buildScope({ runner, token, printer, prompter }: Wizard): Promise<ScopePlan | undefined> {
    const target = await prompter.select({
        message: 'Remove guild commands that duplicate a global command. Which guilds?',
        choices: [
            { value: 'pick', label: 'Pick specific guilds' },
            {
                value: 'all',
                label: 'All guilds the bot is in',
                hint: 'duplicates only, pick specific guilds for a full reset'
            }
        ]
    });

    // a full purge needs named guilds
    if (target === 'all') return { scope: { guildIds: [], allGuilds: true, purge: false } };

    const guilds = await printer.step('guilds', () => runner.listBotGuilds(token), guildsNote);
    const guildIds = await pickGuilds(guilds, printer, prompter);
    if (guildIds.length === 0) return undefined;

    const mode = await prompter.select({
        message: 'What should I remove?',
        choices: [
            { value: 'overlap', label: 'Only duplicates of a global command (recommended)' },
            { value: 'purge', label: 'Every command in these guilds (full reset)' }
        ]
    });

    return { scope: { guildIds, allGuilds: false, purge: mode === 'purge' }, knownGuilds: guilds };
}

function guildsNote(guilds: GuildSummary[]): string {
    const [only] = guilds;
    const found = paint.iris(plural(guilds.length, 'guild'));
    return guilds.length === 1 && only ? `${found}, using ${only.name}` : found;
}

async function pickGuilds(
    guilds: GuildSummary[],
    printer: StepPrinter<WizardStep>,
    prompter: Prompter
): Promise<string[]> {
    if (guilds.length === 0) {
        printer.line();
        printer.line('The bot is in no guilds.');
        return [];
    }
    if (guilds.length === 1) return guilds.map((guild) => guild.id);

    const picked = await prompter.pickMany({
        message: 'Select guilds to clean',
        choices: guilds.map((guild) => ({ value: guild.id, label: guild.name }))
    });
    if (picked.length === 0) {
        printer.line();
        printer.line('No guilds selected.');
    }
    return picked;
}
