import { errorCodeQuestion, QUESTION_LENGTH } from '@seedcord/docs-search';
import { paint } from '@seedcord/errors';
import { TWIN } from '@seedcord/ui/PageAsset';

import { StepsPresenter } from '#commands/commands/StepsPresenter';

import type { PresenterOutput } from '#commands/commands/StepsPresenter';
import type { SiteAddress } from '@seedcord/brand';
import type { CodeMentions, GuideResult } from '@seedcord/docs-search';

export const ASK_STEPS = ['search'] as const;
export type AskStep = (typeof ASK_STEPS)[number];

const SHORTENED = `Your text is over ${QUESTION_LENGTH.max} characters, so seedcord ask searched only the start of it.`;

interface GuidePage {
    title: string;
    path: string;
    sections: GuideResult[];
}

export interface AskFormat {
    pageLines: (page: GuidePage, site: SiteAddress) => string[];
    wholeGuide: (site: SiteAddress) => string;
}

export const FOR_PERSON: AskFormat = {
    pageLines: ({ title, sections }) => [
        paint.bold(title),
        ...sections.flatMap(({ heading, url }) => [
            ...(heading === undefined ? [] : [`  ${heading}`]),
            `  ${paint.sky(url)}`
        ])
    ],
    wholeGuide: (site) => site.url
};

export const FOR_AGENT: AskFormat = {
    pageLines: ({ title, path, sections }, site) => [
        `${paint.bold(title)}: ${paint.sky(site.at(TWIN.publicPath(path)))}`,
        ...sections.flatMap(({ heading }) => (heading === undefined ? [] : [`  - ${heading}`]))
    ],
    wholeGuide: (site) => site.at('llms.txt')
};

function pagesOf(results: readonly GuideResult[]): GuidePage[] {
    const pages = new Map<string, GuidePage>();
    for (const result of results) {
        const path = result.path.replace(/#.*$/, '');
        const title = result.page === result.tab ? result.page : `${result.page} (${result.tab})`;
        const page = pages.get(path) ?? { title, path, sections: [] };
        if (result.heading === undefined) page.sections.unshift(result);
        else page.sections.push(result);
        pages.set(path, page);
    }
    return [...pages.values()];
}

function codeNotes({ swapped, hints }: CodeMentions): string[] {
    return [
        ...swapped.map(({ code, name }) => paint.italic(`${code} is ${paint.bold(name)}`)),
        ...hints.map(({ code, name }) =>
            paint.italic(
                `${code} is also the error code ${paint.bold(name)}. If you meant that, run: ${paint.bold(`seedcord ask "${errorCodeQuestion(code)}"`)}`
            )
        )
    ];
}

interface AskAnswer {
    codes: CodeMentions;
    shortened: boolean;
    results: readonly GuideResult[];
}

export class AskPresenter extends StepsPresenter<AskStep> {
    constructor(
        output: PresenterOutput<AskStep>,
        private readonly format: AskFormat,
        private readonly site: SiteAddress
    ) {
        super(output);
    }

    public answer({ codes, shortened, results }: AskAnswer): void {
        const notes = [...codeNotes(codes), ...(shortened ? [SHORTENED] : [])];
        const pages = pagesOf(results).map((page) => this.format.pageLines(page, this.site));
        const answer = pages.length > 0 ? pages : [[this.noMatches()]];

        this.output.line();
        for (const block of [notes, ...answer]) {
            if (block.length === 0) continue;
            for (const line of block) this.output.line(line);
            this.output.line();
        }
    }

    private noMatches(): string {
        return `Nothing in the guide matches. Try a full sentence, or read ${paint.sky(this.format.wholeGuide(this.site))}`;
    }
}
