import { paint } from '@seedcord/errors';

import { plural } from '#core/format';
import { unlessCancelled } from '#core/prompts/unlessCancelled';

import { RemovePresenter } from './RemovePresenter';
import { REMOVE_STEPS } from './removeSteps';

import type { GuildTargets } from '#commands/commands/scope';
import type { GuildSummary } from '#core/discord/readBotGuilds';
import type { StepPrinter } from '#core/output/StepPrinter';
import type { Prompter } from '#core/prompts/Prompter';
import type { RemoveMode } from './RemoveMode';
import type { RemoveRunner } from './RemoveRunner';

export const WIZARD_STEPS = ['guilds', ...REMOVE_STEPS] as const;
type WizardStep = (typeof WIZARD_STEPS)[number];

export interface WizardPlan {
    mode: RemoveMode;
    guilds: GuildTargets;
}

// undefined stops the wizard after it printed why
export type WizardQuestions = (wizard: RemoveWizard, prompter: Prompter) => Promise<WizardPlan | undefined>;

function guildsNote(guilds: GuildSummary[]): string {
    const [only] = guilds;
    const found = paint.iris(plural(guilds.length, 'guild'));
    return guilds.length === 1 && only ? `${found}, using ${only.name}` : found;
}

export class RemoveWizard {
    constructor(
        private readonly runner: RemoveRunner,
        private readonly printer: StepPrinter<WizardStep>,
        private readonly prompter: Prompter,
        private readonly verbose: boolean
    ) {}

    public async run(questions: WizardQuestions): Promise<void> {
        await unlessCancelled(this.printer, async () => {
            const plan = await questions(this, this.prompter);
            if (!plan) return;

            const confirm = (message: string): Promise<boolean> => this.prompter.confirm({ message });
            await this.runner.run(new RemovePresenter(this.printer, confirm, this.verbose), { ...plan, apply: true });
        });
    }

    public async askGuilds(message: string): Promise<GuildTargets | undefined> {
        const target = await this.prompter.select({
            message,
            choices: [
                { value: 'pick', label: 'Pick specific guilds' },
                { value: 'all', label: 'All guilds the bot is in' }
            ]
        });
        if (target === 'all') return { kind: 'all' };

        const guilds = await this.printer.step('guilds', () => this.runner.listBotGuilds(), guildsNote);
        const picked = await this.pickGuilds(guilds);
        if (!picked) return undefined;
        return {
            kind: 'named',
            ids: picked.map(({ id }) => id),
            knownNames: new Map(guilds.map((g) => [g.id, g.name]))
        };
    }

    private async pickGuilds(guilds: GuildSummary[]): Promise<GuildSummary[] | undefined> {
        if (guilds.length === 0) return this.stop('The bot is in no guilds.');
        if (guilds.length === 1) return guilds;

        const picked = new Set(
            await this.prompter.pickMany({
                message: 'Select guilds',
                choices: guilds.map((guild) => ({ value: guild.id, label: guild.name }))
            })
        );
        if (picked.size === 0) return this.stop('No guilds selected.');
        return guilds.filter((guild) => picked.has(guild.id));
    }

    private stop(reason: string): undefined {
        this.printer.line();
        this.printer.line(reason);
        return undefined;
    }
}
