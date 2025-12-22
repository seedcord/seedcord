import { MonitorSmartphone, Sun, MoonStar } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { log } from '@lib/logger';
import Button from '@ui/Button';
import Icon from '@ui/Icon';

import type { ReactElement } from 'react';

function ThemeToggle(): ReactElement {
    const { resolvedTheme, setTheme } = useTheme();

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
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
                className="text-(--text)"
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
            className="text-(--text)"
        >
            {icon}
        </Button>
    );
}

export default ThemeToggle;
