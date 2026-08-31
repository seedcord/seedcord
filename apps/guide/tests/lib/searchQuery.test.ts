import { describe, expect, it } from 'vitest';

import { stripStopwords } from '#lib/searchQuery';

describe('the query that reaches the index', () => {
    it('drops the words every block contains', () => {
        expect(stripStopwords('migrated to')).toBe('migrated');
    });

    it('leaves a question with only the words that narrow it', () => {
        expect(stripStopwords('how do i defer a reply')).toBe('defer reply');
    });

    it('leaves a query of real words alone', () => {
        expect(stripStopwords('rate limiter')).toBe('rate limiter');
    });

    // stripping every word would search for nothing at all
    it('keeps a query made only of stopwords', () => {
        expect(stripStopwords('how to')).toBe('how to');
    });

    it('keeps a single stopword', () => {
        expect(stripStopwords('to')).toBe('to');
    });

    it('collapses the spacing it leaves behind', () => {
        expect(stripStopwords('  the   gates  ')).toBe('gates');
    });

    it('ignores case when it matches a stopword', () => {
        expect(stripStopwords('How To Defer')).toBe('Defer');
    });

    it('keeps a word the guide gives its own meaning', () => {
        expect(stripStopwords('up down migrations')).toBe('up down migrations');
    });

    it('hands back an empty query unchanged', () => {
        expect(stripStopwords('')).toBe('');
    });
});
