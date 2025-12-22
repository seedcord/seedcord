export function applyScrollDelta(viewport: HTMLDivElement, deltaY: number): void {
    const { scrollHeight, clientHeight, scrollTop } = viewport;
    const maxScrollTop = Math.max(scrollHeight - clientHeight, 0);

    if (maxScrollTop === 0) {
        return;
    }

    const nextScrollTop = Math.min(Math.max(scrollTop + deltaY, 0), maxScrollTop);

    if (nextScrollTop !== scrollTop) {
        viewport.scrollTop = nextScrollTop;
    }
}
