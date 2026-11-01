import { GUIDE } from '@seedcord/ui/sites';

import { GUIDE_SECTIONS_PATH } from '#src/files';
import { guideResult } from '#src/GuideResult';
import { guideHit } from '#src/guideSections';
import { collapseSpaces, parseQuestion } from '#src/question';
import { readJson } from '#src/readAsset';

import type { GuideResult } from '#src/GuideResult';
import type { GuideHit, GuideSection } from '#src/guideSections';

const TITLE_RESULTS = 3;
// five rows with excerpts kept the Related heading in view on a laptop screen
const MATCH_RESULTS = 5;
// about one line of context before the match in a search row
const EXCERPT_LEAD = 40;

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

class Section {
    readonly hit: GuideHit;
    readonly isPage: boolean;
    private readonly words: string[];
    private readonly text: string;
    private readonly lowered: string;

    constructor(section: GuideSection) {
        this.hit = guideHit(section);
        this.isPage = section.heading === undefined;
        this.words = searchWords(section.heading ?? section.page);
        this.text = collapseSpaces(section.text);
        this.lowered = this.text.toLowerCase();
    }

    startsTitle(typed: readonly string[]): boolean {
        return typed.every((word) => this.words.some((titleWord) => titleWord.startsWith(word)));
    }

    wholeWords(typed: readonly string[]): number {
        return typed.filter((word) => this.words.includes(word)).length;
    }

    findExcerpt(phrase: string): string | undefined {
        const at = findWordStart(this.lowered, phrase);
        if (at === -1) return undefined;
        const start = this.text.lastIndexOf(' ', at - EXCERPT_LEAD) + 1;
        return start === 0 ? this.text : `…${this.text.slice(start)}`;
    }
}

export class GuideMatches {
    private readonly sections: Section[];

    constructor(sections: readonly GuideSection[]) {
        this.sections = sections.map((section) => new Section(section));
    }

    // a relative url, read from whichever site serves the page
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
            .filter((section) => section.startsTitle(typed))
            .map((section) => ({ section, wholeWords: section.wholeWords(typed) }))
            .sort((a, b) => Number(b.section.isPage) - Number(a.section.isPage) || b.wholeWords - a.wholeWords)
            .slice(0, TITLE_RESULTS)
            .map(({ section }) => section);
    }

    private matchText(phrase: string, titled: readonly Section[]): GuideResult[] {
        const terms = [phrase] as const;
        const found: GuideResult[] = [];
        for (const section of this.sections) {
            if (titled.length + found.length === MATCH_RESULTS) break;
            const excerpt = titled.includes(section) ? undefined : section.findExcerpt(phrase);
            if (excerpt !== undefined) found.push(guideResult(section.hit, { by: 'text', excerpt, terms }));
        }
        return found;
    }
}
