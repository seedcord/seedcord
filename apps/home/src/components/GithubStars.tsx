'use client';

import { cn, Icon } from '@seedcord/ui';
import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { ReactNode } from 'react';

const REPO_API = 'https://api.github.com/repos/seedcord/seedcord';
const THOUSAND = 1000;
const TWO_DIGIT_K = 10;

function formatStars(count: number): string {
    if (count < THOUSAND) return String(count);
    const k = count / THOUSAND;
    return `${k >= TWO_DIGIT_K ? String(Math.round(k)) : k.toFixed(1).replace('.0', '')}k`;
}

// renders nothing until the count arrives, and nothing at all when the fetch fails
export function GithubStars(): ReactNode {
    const [stars, setStars] = useState<number | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        void fetch(REPO_API, { signal: controller.signal })
            .then(async (res) => (res.ok ? ((await res.json()) as { stargazers_count?: number }) : null))
            .then((data) => {
                if (typeof data?.stargazers_count === 'number') setStars(data.stargazers_count);
            })
            .catch(() => null);
        return () => controller.abort();
    }, []);

    if (stars === null) return null;
    return (
        <span className={cn('hidden items-center gap-1 md:inline-flex')}>
            <Icon icon={Star} size={14} className={cn('fill-current stroke-none')} />
            {formatStars(stars)}
        </span>
    );
}
