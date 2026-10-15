import { isSeedcordError, paint, SeedcordErrorCode } from '@seedcord/errors';

import { plural } from '#core/format';

import { CleanPresenter } from './CleanPresenter';
import { CLEAN_STEP_LABELS } from './cleanSteps';
import { executeClean } from './executeClean';

import type { StepPrinter } from '#core/output/StepPrinter';
import type { Prompter } from '#core/prompts/Prompter';
import type { CleanRunner, CleanScope, GuildSummary } from './CleanRunner';

export const WIZARD_STEPS = ['guilds', ...CLEAN_STEP_LABELS] as const;
type WizardStep = (typeof WIZARD_STEPS)[number];

interface ScopePlan {
    scope: CleanScope;
    knownGuilds?: GuildSummary[];
}

function guildsNote(guilds: GuildSummary[]): string {
    const [only] = guilds;
    const found = paint.iris(plural(guilds.length, 'guild'));
    return guilds.length === 1 && only ? `${found}, using ${only.name}` : found;
}

export class CleanWizard {
    constructor(
        private readonly runner: CleanRunner,
        private readonly token: string,
        private readonly printer: StepPrinter<WizardStep>,
        private readonly prompter: Prompter
    ) {}

    public async run(): Promise<void> {
        try {
            const plan = await this.buildScope();
            if (!plan) return;

            await executeClean({
                runner: this.runner,
                scope: plan.scope,
                apply: true,
                token: this.token,
                presenter: new CleanPresenter(this.printer, (message) => this.prompter.confirm({ message })),
                knownGuilds: plan.knownGuilds
            });
        } catch (error: unknown) {
            if (!isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.CliCancelled)) throw error;
            this.printer.line(paint.mute('cancelled'));
        }
    }

    private async buildScope(): Promise<ScopePlan | undefined> {
        const target = await this.prompter.select({
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

        const guilds = await this.printer.step('guilds', () => this.runner.listBotGuilds(this.token), guildsNote);
        const guildIds = await this.pickGuilds(guilds);
        if (guildIds.length === 0) return undefined;

        const mode = await this.prompter.select({
            message: 'What should I remove?',
            choices: [
                { value: 'overlap', label: 'Only duplicates of a global command (recommended)' },
                { value: 'purge', label: 'Every command in these guilds (full reset)' }
            ]
        });

        return { scope: { guildIds, allGuilds: false, purge: mode === 'purge' }, knownGuilds: guilds };
    }

    private async pickGuilds(guilds: GuildSummary[]): Promise<string[]> {
        if (guilds.length === 0) return this.stop('The bot is in no guilds.');
        if (guilds.length === 1) return guilds.map((guild) => guild.id);

        const picked = await this.prompter.pickMany({
            message: 'Select guilds to clean',
            choices: guilds.map((guild) => ({ value: guild.id, label: guild.name }))
        });
        return picked.length === 0 ? this.stop('No guilds selected.') : picked;
    }

    private stop(reason: string): string[] {
        this.printer.line();
        this.printer.line(reason);
        return [];
    }
}
