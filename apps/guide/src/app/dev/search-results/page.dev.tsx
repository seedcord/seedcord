'use client';

import { cn } from '@seedcord/ui';

import { SearchResultRow } from '#components/SearchResultRow';
import { SearchResultsSkeleton } from '#components/SearchResultsSkeleton';

import type { GuideResult } from '@seedcord/docs-search';
import type { ReactElement } from 'react';

const TERMS = ['cooldown'] as const;

const RESULTS: GuideResult[] = [
    {
        path: '/checks/cooldown/',
        tab: 'Checks',
        page: 'Cooldowns',
        url: 'https://seedcord.org/guide/checks/cooldown/',
        by: 'title',
        terms: TERMS
    },
    {
        path: '/checks/effect-gates/#cooldown',
        tab: 'Checks',
        page: 'Effect gates',
        heading: 'Cooldown',
        url: 'https://seedcord.org/guide/checks/effect-gates/#cooldown',
        by: 'title',
        terms: TERMS
    },
    {
        path: '/checks/rate-limiter/#the-store',
        tab: 'Checks',
        page: 'The rate limiter',
        heading: 'The store',
        url: 'https://seedcord.org/guide/checks/rate-limiter/#the-store',
        by: 'text',
        excerpt:
            '…holds every window. A Cooldown gate reads it during the check and records a use after every gate passes.',
        terms: TERMS
    }
];

const noop = (): void => undefined;

function SearchResultsPreview(): ReactElement {
    return (
        <main className={cn('mx-auto w-full max-w-3xl space-y-6 px-6 py-10')}>
            <h1 className={cn('font-display text-2xl font-semibold tracking-tight text-(--text)')}>Search results</h1>
            <p className={cn('text-subtle text-sm')}>
                Loaded rows above the placeholder rows the dialog shows while related results load. The two should take
                the same height.
            </p>
            <div className={cn('rounded-lg border border-(--border) bg-(--bg) py-3')}>
                {RESULTS.map((result, index) => (
                    <SearchResultRow
                        key={result.path}
                        result={result}
                        isActive={index === 0}
                        optionId={`preview-${result.path}`}
                        onSelect={noop}
                        onActivate={noop}
                    />
                ))}
                <SearchResultsSkeleton />
            </div>
        </main>
    );
}

export default SearchResultsPreview;
