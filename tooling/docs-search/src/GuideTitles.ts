import { GUIDE } from '@seedcord/ui/sites';

import { GUIDE_TITLES_PATH } from '#src/files';
import { guideResult } from '#src/GuideSearch';

import type { GuideResult } from '#src/GuideSearch';
import type { GuideHit } from '#src/guideSections';

const TITLE_RESULTS = 3;

interface Title {
    result: GuideResult;
    isPage: boolean;
    words: string[];
}

interface Match {
    result: GuideResult;
    isPage: boolean;
    wholeWords: number;
}

const wordsOf = (text: string): string[] => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

// undefined when a typed word starts none of the title's words
function wholeWordsIn(title: Title, typed: readonly string[]): number | undefined {
    let whole = 0;
    for (const word of typed) {
        if (title.words.includes(word)) whole += 1;
        else if (!title.words.some((titleWord) => titleWord.startsWith(word))) return undefined;
    }
    return whole;
}

export class GuideTitles {
    private readonly titles: Title[];

    constructor(hits: readonly GuideHit[]) {
        this.titles = hits.map((hit) => ({
            result: guideResult(hit),
            isPage: hit.heading === undefined,
            words: wordsOf(hit.heading ?? hit.page)
        }));
    }

    // the page's own origin, since the same build wrote this file
    static async load(): Promise<GuideTitles> {
        const path = `${GUIDE.path}${GUIDE_TITLES_PATH}`;
        const response = await fetch(path);
        if (!response.ok) throw new Error(`${path} failed to load with status ${response.status}`);
        // the guide build writes this file from the same type
        return new GuideTitles((await response.json()) as GuideHit[]);
    }

    match(input: string): GuideResult[] {
        const typed = wordsOf(input);
        if (typed.length === 0) return [];

        const matches: Match[] = [];
        for (const title of this.titles) {
            const wholeWords = wholeWordsIn(title, typed);
            if (wholeWords !== undefined) matches.push({ result: title.result, isPage: title.isPage, wholeWords });
        }
        return matches
            .sort((a, b) => Number(b.isPage) - Number(a.isPage) || b.wholeWords - a.wholeWords)
            .slice(0, TITLE_RESULTS)
            .map(({ result }) => result);
    }
}
