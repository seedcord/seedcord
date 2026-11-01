'use client';

import { findWordStart } from '@seedcord/docs-search';
import { useCallback } from 'react';

import type { ReactElement } from 'react';

// globals.css styles ::highlight(search-match)
const HIGHLIGHT = 'search-match';

function searchHighlight(): Highlight {
    const existing = CSS.highlights.get(HIGHLIGHT);
    if (existing) return existing;

    const created = new Highlight();
    CSS.highlights.set(HIGHLIGHT, created);
    return created;
}

function rangesOf(node: Text, terms: readonly string[]): Range[] {
    const text = node.data.toLowerCase();
    const ranges: Range[] = [];
    for (const term of terms) {
        for (let at = findWordStart(text, term); at !== -1; at = findWordStart(text, term, at + term.length)) {
            const range = new Range();
            range.setStart(node, at);
            range.setEnd(node, at + term.length);
            ranges.push(range);
        }
    }
    return ranges;
}

export interface MatchedTextProps {
    text: string;
    terms: readonly string[];
    className: string;
}

export function MatchedText({ text, terms, className }: MatchedTextProps): ReactElement {
    const mark = useCallback(
        (element: HTMLSpanElement | null) => {
            const node = element?.firstChild;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- the Highlight API only reached every major browser in June 2025
            if (!(node instanceof Text) || CSS.highlights === undefined) return undefined;

            const highlight = searchHighlight();
            const ranges = rangesOf(node, terms);
            for (const range of ranges) highlight.add(range);
            return () => {
                for (const range of ranges) highlight.delete(range);
            };
        },
        [terms]
    );

    return (
        <span ref={mark} className={className}>
            {text}
        </span>
    );
}
