'use client';

import { cn, Icon, NpmIcon } from '@seedcord/ui';
import { useEffect, useState } from 'react';

import { PosterButton } from '#components/ui/PosterButton';
import { NPM_URL } from '#lib/site';

import type { ReactNode } from 'react';

// the workspace version runs ahead of the registry during changesets pre-mode
const LATEST_API = 'https://registry.npmjs.org/seedcord/latest';

export function NpmVersion(): ReactNode {
    const [version, setVersion] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        void fetch(LATEST_API, { signal: controller.signal })
            .then(async (res) => (res.ok ? ((await res.json()) as { version?: string }) : null))
            .then((data) => {
                if (typeof data?.version === 'string') setVersion(data.version);
            })
            .catch(() => null);
        return () => controller.abort();
    }, []);

    if (version === null) return null;
    return (
        <PosterButton
            href={NPM_URL}
            variant="ink"
            ariaLabel={`seedcord v${version} on npm`}
            className={cn('font-mono-code group px-3 py-1.5 text-sm whitespace-nowrap')}
        >
            <Icon icon={NpmIcon} size={20} className={cn('text-(--flesh) group-hover:text-(--pith) md:size-4')} />
            <span className={cn('sr-only md:not-sr-only')}>v{version}</span>
        </PosterButton>
    );
}
