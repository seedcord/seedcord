import { NEXT_GUIDE, PRODUCTION_SITES } from '@seedcord/brand';
import { GuideSearch } from '@seedcord/docs-search';
import { isInteractive } from '@seedcord/utils/internal';

import { BaseCommand } from '#core/BaseCommand';
import { version } from '#core/version';

import { ASK_STEPS, FOR_AGENT, FOR_PERSON } from './AskPresenter';
import { AskRunner } from './AskRunner';

import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

const isPrerelease = version.includes('-');

// production only has what's on main
const GUIDE_SITE = isPrerelease ? NEXT_GUIDE : PRODUCTION_SITES.guide;

export class AskCommand extends BaseCommand {
    private readonly runner = new AskRunner(GUIDE_SITE, new GuideSearch(GUIDE_SITE));

    constructor() {
        super('ask', 'Search the guide', { needsProject: false });
    }

    public register(program: Command): CommandUnknownOpts {
        return this.define(program)
            .argument('<question...>', 'What to search for, or an error code or message to look up')
            .allowUnknownOption()
            .action((words, _options, command) => {
                const question = words.join(' ');
                return isInteractive()
                    ? this.runSteps(command, ASK_STEPS, (printer) => this.runner.run(printer, FOR_PERSON, question))
                    : this.runQuietSteps(command, ASK_STEPS, (printer) =>
                          this.runner.run(printer, FOR_AGENT, question)
                      );
            });
    }
}
