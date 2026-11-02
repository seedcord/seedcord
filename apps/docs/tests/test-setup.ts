import '@testing-library/jest-dom/vitest';

// jsdom omits ResizeObserver
class StubResizeObserver implements ResizeObserver {
    public observe(): void {}
    public unobserve(): void {}
    public disconnect(): void {}
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- lib.dom types it as always there
globalThis.ResizeObserver ??= StubResizeObserver;
