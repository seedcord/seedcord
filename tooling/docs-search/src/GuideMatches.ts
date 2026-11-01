import { GUIDE } from '@seedcord/ui/sites';

import { GUIDE_SECTIONS_PATH } from '#src/files';
import { guideResult, parseQuestion } from '#src/GuideSearch';
import { guideHit } from '#src/guideSections';
import { readJson } from '#src/readAsset';

import type { GuideResult } from '#src/GuideSearch';
import type { GuideSection } from '#src/guideSections';

const TITLE_RESULTS = 3;
// five rows with excerpts kept the Related heading in view on a laptop screen
const MATCH_RESULTS = 5;
// about one line of context before the match in a search row
const EXCERPT_LEAD = 40;

interface Section {
    result: GuideResult;
    isPage: boolean;
    words: string[];
    text: string;
    lowered: string;
}

// lowercase terms. a title marks each typed word; an excerpt marks the whole phrase
export interface MatchTerms {
    title: readonly string[];
    text: readonly string[];
}

const searchWords = (text: string): string[] => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

export function matchTerms(input: string): MatchTerms {
    const phrase = parseQuestion(input)?.toLowerCase();
    return { title: searchWords(input), text: phrase === undefined ? [] : [phrase] };
}

const isWordCharacter = (character: string): boolean => searchWords(character).length > 0;

// a term that opens on punctuation, like a pasted `{ per`, matches anywhere
export function findWordStart(text: string, term: string, from = 0): number {
    const anywhere = !isWordCharacter(term.charAt(0));
    for (let at = text.indexOf(term, from); at !== -1; at = text.indexOf(term, at + 1)) {
        if (anywhere || !isWordCharacter(text.charAt(at - 1))) return at;
    }
    return -1;
}

// undefined when a typed word starts none of the title's words
function wholeWordsIn(section: Section, typed: readonly string[]): number | undefined {
    let whole = 0;
    for (const word of typed) {
        if (section.words.includes(word)) whole += 1;
        else if (!section.words.some((titleWord) => titleWord.startsWith(word))) return undefined;
    }
    return whole;
}

function excerpt(text: string, at: number): string {
    const start = text.lastIndexOf(' ', at - EXCERPT_LEAD) + 1;
    return start === 0 ? text : `…${text.slice(start)}`;
}

export class GuideMatches {
    private readonly sections: Section[];

    constructor(sections: readonly GuideSection[]) {
        this.sections = sections.map((section) => {
            const text = section.text.replaceAll(/\s+/g, ' ');
            return {
                result: guideResult(guideHit(section)),
                isPage: section.heading === undefined,
                words: searchWords(section.heading ?? section.page),
                text,
                lowered: text.toLowerCase()
            };
        });
    }

    // the page's own origin, since the same build wrote this file
    static async load(): Promise<GuideMatches> {
        return new GuideMatches(await readJson<GuideSection[]>(`${GUIDE.path}${GUIDE_SECTIONS_PATH}`));
    }

    match(input: string): GuideResult[] {
        const { title, text } = matchTerms(input);
        const titles = this.matchTitles(title);
        const [phrase] = text;
        return phrase === undefined ? titles : [...titles, ...this.matchText(phrase, titles)];
    }

    private matchTitles(typed: readonly string[]): GuideResult[] {
        if (typed.length === 0) return [];

        return this.sections
            .flatMap((section) => {
                const wholeWords = wholeWordsIn(section, typed);
                return wholeWords === undefined ? [] : [{ section, wholeWords }];
            })
            .sort((a, b) => Number(b.section.isPage) - Number(a.section.isPage) || b.wholeWords - a.wholeWords)
            .slice(0, TITLE_RESULTS)
            .map(({ section }) => section.result);
    }

    private matchText(phrase: string, titles: readonly GuideResult[]): GuideResult[] {
        const found: GuideResult[] = [];
        for (const section of this.sections) {
            if (titles.length + found.length === MATCH_RESULTS) break;
            const at = titles.includes(section.result) ? -1 : findWordStart(section.lowered, phrase);
            if (at !== -1) found.push({ ...section.result, excerpt: excerpt(section.text, at) });
        }
        return found;
    }
}
