'use client';

import { cn } from '@seedcord/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { pressable } from '#components/ui/press';
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
        <Link
            href={NPM_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={`seedcord v${version} on npm`}
            className={cn(
                'font-mono-code rounded-sm bg-(--rind-deep) px-1.5 py-0.5 text-[11px] font-semibold text-(--pith)',
                pressable
            )}
        >
            v{version}
        </Link>
    );
}
