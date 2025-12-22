'use client';

import { useEffect } from 'react';

interface Handlers {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    onScroll: () => void;
    onTouchStart: () => void;
}

const HIDE_TIMEOUT_MS = 900;

function ScrollbarVisibility(): null {
    useEffect(() => {
        let globalHideTimer: number | null = null;

        const handlerMap = new WeakMap<Element, Handlers>();

        function show(el: HTMLElement): void {
            if (!el.classList.contains('show-scrollbar')) {
                el.classList.add('show-scrollbar');
            }
            if (globalHideTimer !== null) {
                window.clearTimeout(globalHideTimer);
                globalHideTimer = null;
            }
        }

        function scheduleHide(el: HTMLElement): void {
            if (globalHideTimer !== null) {
                window.clearTimeout(globalHideTimer);
            }
            globalHideTimer = window.setTimeout(() => {
                el.classList.remove('show-scrollbar');
                globalHideTimer = null;
            }, HIDE_TIMEOUT_MS) as unknown as number;
        }

        function attach(el: Element): void {
            const node = el as HTMLElement;

            const onPointerEnter = (): void => show(node);
            const onPointerLeave = (): void => scheduleHide(node);
            const onScroll = (): void => {
                show(node);
                scheduleHide(node);
            };
            const onTouchStart = (): void => {
                show(node);
                scheduleHide(node);
            };

            node.addEventListener('pointerenter', onPointerEnter, { passive: true });
            node.addEventListener('pointerleave', onPointerLeave, { passive: true });
            node.addEventListener('scroll', onScroll, { passive: true });
            node.addEventListener('touchstart', onTouchStart, { passive: true });

            handlerMap.set(node, { onPointerEnter, onPointerLeave, onScroll, onTouchStart });
        }

        function detach(el: Element): void {
            const h = handlerMap.get(el);
            if (!h) return;
            el.removeEventListener('pointerenter', h.onPointerEnter);
            el.removeEventListener('pointerleave', h.onPointerLeave);
            el.removeEventListener('scroll', h.onScroll);
            el.removeEventListener('touchstart', h.onTouchStart);
            handlerMap.delete(el);
        }

        const observer = new MutationObserver(() => {
            document.querySelectorAll('.code-scroll-area').forEach((el) => {
                if (!handlerMap.has(el)) {
                    attach(el);
                }
            });
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        // attach existing
        document.querySelectorAll('.code-scroll-area').forEach((el) => attach(el));

        return () => {
            observer.disconnect();
            document.querySelectorAll('.code-scroll-area').forEach((el) => detach(el));
        };
    }, []);

    return null;
}

export default ScrollbarVisibility;
