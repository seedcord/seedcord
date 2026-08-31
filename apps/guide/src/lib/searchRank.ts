interface Result {
    type: string;
    content: string;
}

interface Group<T> {
    rows: T[];
    titleCovered: number;
    titleWords: number;
    covered: number;
}

const MARKS = /<\/?mark>/g;

function coverage(content: string, terms: readonly string[]): number {
    const plain = content.replace(MARKS, '').toLowerCase();
    return terms.filter((term) => plain.includes(term)).length;
}

function wordCount(content: string): number {
    return content.replace(MARKS, '').split(/\s+/).filter(Boolean).length;
}

function better<T>(left: Group<T>, right: Group<T>): number {
    if (left.covered !== right.covered) return right.covered - left.covered;
    if (left.titleCovered !== right.titleCovered) return right.titleCovered - left.titleCovered;
    // a title saying the same thing in fewer words is the tighter match
    if (left.titleCovered > 0) return left.titleWords - right.titleWords;
    return 0;
}

/**
 * Reorders whole pages by how much of the query they cover, breaking a tie on the title.
 * BM25 scores a two word block above a paragraph that answers the question, since it divides by length.
 */
export function rankByCoverage<T extends Result>(results: readonly T[], query: string): T[] {
    const terms = query
        .toLowerCase()
        .split(/\s+/)
        .filter((term) => term.length > 0);
    if (terms.length < 2) return [...results];

    const groups: Group<T>[] = [];
    for (const row of results) {
        if (row.type === 'page' || groups.length === 0) {
            groups.push({ rows: [], titleCovered: 0, titleWords: 0, covered: 0 });
        }
        const group = groups[groups.length - 1];
        if (!group) continue;

        group.rows.push(row);
        const found = coverage(row.content, terms);
        // the page row carries the title
        if (row.type === 'page') {
            group.titleCovered = found;
            group.titleWords = wordCount(row.content);
        }
        group.covered = Math.max(group.covered, found);
    }

    // sort() is stable. pages scoring the same keep the order the index gave them
    return groups
        .slice()
        .sort(better)
        .flatMap((group) => group.rows);
}
