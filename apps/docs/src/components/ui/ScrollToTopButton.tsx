'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn, tw } from '@lib/utils';

import Button from './Button';

import type { ReactElement } from 'react';

interface ScrollToTopButtonProps {
    className?: string;
}

const VIEWPORT_THRESHOLD_MULTIPLIER = 0.4;
const MIN_SCROLL_THRESHOLD = 180;
const MAX_SCROLL_THRESHOLD = 520;

function ScrollToTopButton({ className }: ScrollToTopButtonProps): ReactElement {
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

    const handleClick = (): void => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            aria-label="Jump to top"
            className={cn(
                'border-border/80 shadow-soft h-12 w-12 rounded-full border bg-(--surface-moderate) text-(--text) transition-all duration-300 hover:-translate-y-1 hover:border-(--border-accent-a-subtle) hover:bg-(--surface-accent-a-moderate)',
                visible
                    ? tw`pointer-events-auto transform-[translate3d(0,0,0)] opacity-100`
                    : tw`pointer-events-none transform-[translate3d(0,16px,0)] opacity-0`,
                className
            )}
        >
            <ArrowUp className="h-5 w-5" aria-hidden />
            <span className="sr-only">Jump to top</span>
        </Button>
    );
}

export default ScrollToTopButton;
