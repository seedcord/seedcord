interface Result {
    type: string;
    content: string;
}

interface Group<T> {
    rows: T[];
    covered: number;
}

const MARKS = /<\/?mark>/g;

function coverage(content: string, terms: readonly string[]): number {
    const plain = content.replace(MARKS, '').toLowerCase();
    return terms.filter((term) => plain.includes(term)).length;
}

/**
 * Reorders whole pages by how many distinct query words their best block contains.
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
        if (row.type === 'page' || groups.length === 0) groups.push({ rows: [], covered: 0 });
        const group = groups[groups.length - 1];
        if (!group) continue;
        group.rows.push(row);
        group.covered = Math.max(group.covered, coverage(row.content, terms));
    }

    // sort() is stable. pages covering the same count keep the order the index gave them
    return groups
        .slice()
        .sort((left, right) => right.covered - left.covered)
        .flatMap((group) => group.rows);
}
