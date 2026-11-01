import { GUIDE } from '@seedcord/ui/sites';

import { GUIDE_SECTIONS_PATH } from '#src/files';
import { guideResult, parseQuestion } from '#src/GuideSearch';
import { guideHit } from '#src/guideSections';
import { readJson } from '#src/readAsset';

import type { GuideResult } from '#src/GuideSearch';
import type { GuideHit, GuideSection } from '#src/guideSections';

const TITLE_RESULTS = 3;
// five rows with excerpts kept the Related heading in view on a laptop screen
const MATCH_RESULTS = 5;
// about one line of context before the match in a search row
const EXCERPT_LEAD = 40;

interface Section {
    hit: GuideHit;
    isPage: boolean;
    words: string[];
    text: string;
    lowered: string;
}

const searchWords = (text: string): string[] => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

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
                hit: guideHit(section),
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
        const words = searchWords(input);
        const titled = this.matchTitles(words);
        const titles = titled.map((section) => guideResult(section.hit, { by: 'title', terms: words }));
        const phrase = parseQuestion(input)?.toLowerCase();
        return phrase === undefined ? titles : [...titles, ...this.matchText(phrase, titled)];
    }

    private matchTitles(typed: readonly string[]): Section[] {
        if (typed.length === 0) return [];

        return this.sections
            .flatMap((section) => {
                const wholeWords = wholeWordsIn(section, typed);
                return wholeWords === undefined ? [] : [{ section, wholeWords }];
            })
            .sort((a, b) => Number(b.section.isPage) - Number(a.section.isPage) || b.wholeWords - a.wholeWords)
            .slice(0, TITLE_RESULTS)
            .map(({ section }) => section);
    }

    private matchText(phrase: string, titled: readonly Section[]): GuideResult[] {
        const terms = [phrase] as const;
        const found: GuideResult[] = [];
        for (const section of this.sections) {
            if (titled.length + found.length === MATCH_RESULTS) break;
            const at = titled.includes(section) ? -1 : findWordStart(section.lowered, phrase);
            if (at !== -1) {
                found.push(guideResult(section.hit, { by: 'text', excerpt: excerpt(section.text, at), terms }));
            }
        }
        return found;
    }
}
