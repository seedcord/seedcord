'use client';

import { Button, cn } from '@seedcord/ui';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { BACKGROUND_CANDIDATES } from './candidates';

import type { ReactElement } from 'react';

const DEFAULT_BG = '#1f1f1f';

export function BackgroundPicker(): ReactElement {
    const { setTheme } = useTheme();
    const [active, setActive] = useState(DEFAULT_BG);

    useEffect(() => {
        setTheme('dark');
    }, [setTheme]);

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--color-bg', active);
        return () => {
            root.style.removeProperty('--color-bg');
        };
    }, [active]);

    const current = BACKGROUND_CANDIDATES.find((candidate) => candidate.hex === active);

    return (
        <div className={cn('sticky top-2 z-50 rounded-md border border-(--border) bg-(--bg-navbar) p-3 shadow-lg')}>
            <div className={cn('flex flex-wrap gap-2')}>
                {BACKGROUND_CANDIDATES.map((candidate) => (
                    <Button
                        key={candidate.id}
                        variant={candidate.hex === active ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setActive(candidate.hex)}
                    >
                        <span
                            className={cn('mr-2 inline-block size-3 rounded-xs border border-(--border)')}
                            style={{ backgroundColor: candidate.hex }}
                        />
                        {candidate.label}
                    </Button>
                ))}
            </div>
            <p className={cn('text-subtle mt-2 font-mono text-xs')}>
                {active} · {current?.note}
            </p>
        </div>
    );
}
