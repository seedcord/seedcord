import '@testing-library/jest-dom/vitest';

import { pathToFileURL } from 'node:url';

export const DOCS_INDEX_FIXTURE = pathToFileURL(`${import.meta.dirname}/fixtures/docs-index.json`).href;

process.env.SEEDCORD_DOCS_INDEX_URL = DOCS_INDEX_FIXTURE;

// jsdom omits ResizeObserver
class StubResizeObserver implements ResizeObserver {
    public observe(): void {}
    public unobserve(): void {}
    public disconnect(): void {}
}

globalThis.ResizeObserver ??= StubResizeObserver;
