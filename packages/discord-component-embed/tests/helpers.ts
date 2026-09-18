import { expect } from 'vitest';

import { ComponentEmbedError } from '#src/index';

export function scriptBody(html: string): string {
    const match = /^<script id="discord:component-embed" type="application\/json">(.*)<\/script>$/s.exec(html);
    if (!match?.[1]) throw new Error(`not a component embed script: ${html}`);
    return match[1];
}

// toThrow(message) alone also passes for a TypeError carrying the same text
export function expectEmbedError(run: () => unknown, message: string | RegExp): void {
    expect(run).toThrow(ComponentEmbedError);
    expect(run).toThrow(message);
}
