'use client';

import { MonitorSmartphone, MoonStar, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Button } from './Button';
import { Icon } from './Icon';
import { cn } from './lib/cn';

import type { ReactElement } from 'react';

export function ThemeToggle(): ReactElement {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // next-themes resolves the active theme one tick after mount
        const t = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(t);
    }, []);

    if (!mounted) {
        return (
            <Button
                variant="ghost"
                size="icon"
                aria-label="Toggle theme"
                title="Toggle theme"
                className={cn('text-(--text)')}
                disabled
            >
                <Icon icon={MonitorSmartphone} size={18} />
            </Button>
        );
    }

    const isDark = resolvedTheme === 'dark';
    const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={label}
            title={label}
            className={cn('text-(--text)')}
        >
            <Icon icon={isDark ? Sun : MoonStar} size={18} />
        </Button>
    );
}
