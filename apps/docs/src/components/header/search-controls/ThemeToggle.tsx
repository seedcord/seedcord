import { Button, Icon, cn } from '@seedcord/ui';
import { MonitorSmartphone, Sun, MoonStar } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { log } from '@lib/logger';

import type { ReactElement } from 'react';

function ThemeToggle(): ReactElement {
    const { resolvedTheme, setTheme } = useTheme();

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // justified: next-themes resolves the active theme one tick after mount, the timer skips one frame to read the resolved value, not the SSR default.
        const t = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(t);
    }, []);

    const handleToggle = (): void => {
        const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        log('Theme toggle activated', { from: resolvedTheme, to: nextTheme });
    };

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

    const icon = resolvedTheme === 'dark' ? <Icon icon={Sun} size={18} /> : <Icon icon={MoonStar} size={18} />;
    const label = resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            aria-label={label}
            title={label}
            className={cn('text-(--text)')}
        >
            {icon}
        </Button>
    );
}

export default ThemeToggle;
