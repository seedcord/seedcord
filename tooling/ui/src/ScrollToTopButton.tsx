'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from './Button';
import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { ReactElement } from 'react';

export interface ScrollToTopButtonProps {
    /** `floating` hovers over the page. `inline` matches a labelled toolbar row such as CopyPageButton. */
    variant?: 'floating' | 'inline';
    className?: string;
}

const LABEL = 'Jump to top';

const VIEWPORT_THRESHOLD_MULTIPLIER = 0.4;
const MIN_SCROLL_THRESHOLD = 180;
const MAX_SCROLL_THRESHOLD = 520;

function scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function ScrollToTopButton({ variant = 'floating', className }: ScrollToTopButtonProps): ReactElement {
    const [visible, setVisible] = useState(false);
    const thresholdRef = useRef(0);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const computeThreshold = (): number => {
            const viewportHeight = window.innerHeight || 0;
            const derived = viewportHeight * VIEWPORT_THRESHOLD_MULTIPLIER;
            return Math.min(MAX_SCROLL_THRESHOLD, Math.max(MIN_SCROLL_THRESHOLD, derived));
        };

        const updateThreshold = (): void => {
            thresholdRef.current = computeThreshold();
        };

        const handleScroll = (): void => {
            setVisible(window.scrollY > thresholdRef.current);
        };

        const handleResize = (): void => {
            updateThreshold();
            handleScroll();
        };

        updateThreshold();
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    if (variant === 'inline') {
        return (
            <Button
                variant="ghost"
                size="sm"
                onClick={scrollToTop}
                className={cn('text-subtle shrink-0 gap-2 hover:text-(--text)', className)}
            >
                <ArrowUp size={16} aria-hidden className={cn('shrink-0')} />
                {LABEL}
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={scrollToTop}
            aria-label={LABEL}
            className={cn(
                // both backgrounds are opaque. body text shows through the --surface-* family
                'border-border/80 shadow-soft z-50 border bg-(--bg-popover) text-(--text) transition-all duration-300 hover:-translate-y-1 hover:border-(--border-accent-a-subtle) hover:bg-(--bg-accent-a-moderate)',
                // a page clears this with pb-(--jump-clearance)
                'fixed bottom-(--jump-bottom) size-(--jump-size)',
                visible
                    ? tw`pointer-events-auto transform-[translate3d(0,0,0)] opacity-100`
                    : tw`pointer-events-none transform-[translate3d(0,16px,0)] opacity-0`,
                className
            )}
        >
            <ArrowUp className={cn('size-5')} aria-hidden />
        </Button>
    );
}
