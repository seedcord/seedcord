'use client';

import { useCallback, useEffect } from 'react';

export function useMemberNavigation(): (anchorId: string) => void {
    const openMemberSection = useCallback((anchorId: string) => {
        if (!anchorId || typeof document === 'undefined') {
            return;
        }

        const targetElement = document.getElementById(anchorId);

        if (targetElement) {
            window.requestAnimationFrame(() => {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
    }, []);

    useEffect(() => {
        const handleHashNavigation = (): void => {
            if (typeof window === 'undefined') {
                return;
            }

            const targetId = window.location.hash.replace(/^#/, '');
            if (targetId) {
                openMemberSection(targetId);
            }
        };

        handleHashNavigation();
        window.addEventListener('hashchange', handleHashNavigation);

        return () => {
            window.removeEventListener('hashchange', handleHashNavigation);
        };
    }, [openMemberSection]);

    return openMemberSection;
}
