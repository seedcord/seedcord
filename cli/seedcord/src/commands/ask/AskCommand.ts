import { NEXT_GUIDE, PRODUCTION_SITES } from '@seedcord/brand';
import { GuideSearch } from '@seedcord/docs-search';
import { isInteractive } from '@seedcord/utils/internal';

import { BaseCommand } from '#core/BaseCommand';
import { StepPrinter } from '#core/output/StepPrinter';
import { isVerbose } from '#core/verbose';
import { version } from '#core/version';

import { ASK_STEPS, FOR_AGENT, FOR_PERSON } from './AskPresenter';
import { AskRunner } from './AskRunner';

import type { AskStep } from './AskPresenter';
import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

// a prerelease CLI searches the guide that matches it. production only has what's on main
const GUIDE_SITE = version.includes('-') ? NEXT_GUIDE : PRODUCTION_SITES.guide;

class AnswerOnlyPrinter extends StepPrinter<AskStep> {
    public override step<Result>(_label: AskStep, task: () => Promise<Result>): Promise<Result> {
        return task();
    }
}

export class AskCommand extends BaseCommand {
    private readonly runner = new AskRunner(GUIDE_SITE, new GuideSearch(GUIDE_SITE));

    constructor() {
        super('ask', 'Search the guide', { needsProject: false });
    }

    public register(program: Command): CommandUnknownOpts {
        return this.define(program)
            .argument('<question...>', 'What to search for, or an error code or message to look up')
            .action((words, _options, command) => {
                const question = words.join(' ');
                if (isInteractive()) {
                    return this.runSteps(command, ASK_STEPS, (printer) =>
                        this.runner.run(printer, FOR_PERSON, question)
                    );
                }
                const printer = new AnswerOnlyPrinter({
                    command: this.name,
                    labels: ASK_STEPS,
                    verbose: isVerbose(command)
                });
                return this.runner.run(printer, FOR_AGENT, question);
            });
    }
}
