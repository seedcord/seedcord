// zbsearch matches any term in the query. nearly every block contains a word this common
const STOPWORDS = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'but',
    'by',
    'can',
    'do',
    'does',
    'for',
    'from',
    'how',
    'i',
    'if',
    'in',
    'is',
    'it',
    'its',
    'me',
    'my',
    'of',
    'on',
    'or',
    'that',
    'the',
    'their',
    'them',
    'then',
    'there',
    'these',
    'this',
    'to',
    'was',
    'we',
    'what',
    'when',
    'where',
    'which',
    'why',
    'will',
    'with',
    'you',
    'your'
]);

export function stripStopwords(query: string): string {
    const words = query.split(/\s+/).filter(Boolean);
    const kept = words.filter((word) => !STOPWORDS.has(word.toLowerCase()));

    // a query of nothing but stopwords would otherwise search for nothing
    return kept.length === 0 ? words.join(' ') : kept.join(' ');
}
