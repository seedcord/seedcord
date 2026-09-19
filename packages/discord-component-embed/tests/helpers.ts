import { expect } from 'vitest';

import { ComponentEmbedError, Container, TextDisplay, h } from '#src/index';

import type { EmbedElement, EmbedNode } from '#src/index';

export function scriptBody(html: string): string {
    const match = /^<script id="discord:component-embed" type="application\/json">(.*)<\/script>$/s.exec(html);
    if (!match?.[1]) throw new Error(`not a component embed script: ${html}`);
    return match[1];
}

export function inContainer(child: EmbedNode): EmbedElement {
    return h(Container, null, child);
}

export function withText(content: string): EmbedElement {
    return inContainer(h(TextDisplay, null, content));
}

export function thrownBy(run: () => unknown): ComponentEmbedError {
    try {
        run();
    } catch (error) {
        if (error instanceof ComponentEmbedError) return error;
        throw new Error(`expected a ComponentEmbedError, got ${String(error)}`, { cause: error });
    }
    throw new Error('expected a ComponentEmbedError, nothing was thrown');
}

export function expectEmbedError(run: () => unknown, message: string | RegExp): void {
    const { message: actual } = thrownBy(run);
    if (typeof message === 'string') expect(actual).toContain(message);
    else expect(actual).toMatch(message);
}
