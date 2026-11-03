import { ErrorCodeReader, QUESTION_RULE, questionFromText, SearchUnavailable } from '@seedcord/docs-search';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import { AskPresenter } from './AskPresenter';

import type { PresenterOutput } from '#commands/commands/StepsPresenter';
import type { AskFormat, AskStep } from './AskPresenter';
import type { SiteAddress } from '@seedcord/brand';
import type { GuideResult, GuideSearch, Question } from '@seedcord/docs-search';

// an uncached search takes about 0.6s
const SEARCH_TIMEOUT_MS = 10_000;

const CODE_READER = new ErrorCodeReader(SeedcordErrorCode);

export class AskRunner {
    constructor(
        private readonly site: SiteAddress,
        private readonly guide: Pick<GuideSearch, 'search'>
    ) {}

    public async run(output: PresenterOutput<AskStep>, format: AskFormat, text: string): Promise<void> {
        const { question, shortened } = questionFromText(text);
        if (question === undefined) throw new SeedcordTypeError(SeedcordErrorCode.CliAskBadQuestion, [QUESTION_RULE]);

        const presenter = new AskPresenter(output, format, this.site);
        presenter.detail('site', this.site.url);
        const results = await presenter.step('search', () => this.search(question));
        presenter.answer({ codes: CODE_READER.read(question), shortened, results });
    }

    private async search(question: Question): Promise<GuideResult[]> {
        try {
            return await this.guide.search(question, AbortSignal.timeout(SEARCH_TIMEOUT_MS));
        } catch (error: unknown) {
            if (error instanceof SearchUnavailable) {
                throw new SeedcordError(SeedcordErrorCode.CliAskHasToWait, [error.message, this.site.url], {
                    cause: error
                });
            }
            throw new SeedcordError(SeedcordErrorCode.CliAskFailed, [asError(error).message, this.site.url], {
                cause: error
            });
        }
    }
}
