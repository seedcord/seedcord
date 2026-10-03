import { expect } from 'vitest';

import { ComponentEmbedError, Container, TextDisplay, h } from '#src/index';

import type { CheckInput } from '#src/check';
import type { EmbedElement, EmbedNode } from '#src/index';

export const card = (...components: unknown[]): string => JSON.stringify({ component: { type: 17, components } });

export const page = (head: string): string => `<!doctype html><html><head>${head}</head><body>hi</body></html>`;

export const HTML = { 'content-type': 'text/html; charset=utf-8' };

export const VND = 'application/vnd.discord.component-embed+json';
export const TYPES = `type="${VND}" or type="application/json"`;

export function withFiles(files: Record<string, string>): CheckInput {
    return {
        readFile: (path) => {
            const text = files[path];
            if (text === undefined) return Promise.reject(new Error(`ENOENT: no such file, open '${path}'`));
            return Promise.resolve(text);
        },
        fetch: () => Promise.reject(new Error('no network in this test')),
        nowMs: () => 0
    };
}

export function withPages(pages: Record<string, string>, userAgents: string[] = []): CheckInput {
    return {
        readFile: () => Promise.reject(new Error('no files in this test')),
        fetch: (url, init) => {
            userAgents.push(new Headers(init.headers).get('user-agent') ?? '');
            const body = pages[url];
            return Promise.resolve(
                body === undefined ? new Response('', { status: 404 }) : new Response(body, { headers: HTML })
            );
        },
        nowMs: () => 0
    };
}

// Response adds text/plain to a string body; bytes get no content type
export function serving(html: string, headers: Record<string, string>): CheckInput {
    return {
        ...withPages({}),
        fetch: () => Promise.resolve(new Response(new TextEncoder().encode(html), { headers }))
    };
}

// each url takes its delay in ms to answer, on a clock that only the fetches move
export function withSlowPages(
    pages: Record<string, string>,
    delays: Record<string, number>,
    fetched: string[] = []
): CheckInput {
    let now = 0;
    return {
        ...withPages(pages),
        fetch: (url, init) => {
            fetched.push(url);
            now += delays[url] ?? 0;
            return withPages(pages).fetch(url, init);
        },
        nowMs: () => now
    };
}

export function scriptBody(html: string): string {
    const match =
        /^<script id="discord:component-embed" type="application\/vnd\.discord\.component-embed\+json">(.*)<\/script>$/s.exec(
            html
        );
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
