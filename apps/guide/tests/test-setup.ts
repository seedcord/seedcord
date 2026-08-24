import '@testing-library/jest-dom/vitest';

// jsdom omits ResizeObserver
class StubResizeObserver implements ResizeObserver {
    public observe(): void {}
    public unobserve(): void {}
    public disconnect(): void {}
}

globalThis.ResizeObserver ??= StubResizeObserver;
