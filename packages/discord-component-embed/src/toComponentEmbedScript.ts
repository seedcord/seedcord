import { toComponentEmbed } from './toComponentEmbed';

import type { ReactElement } from 'react';

/**
 * Returns the `<script>` tag Discord reads for a component embed, as an HTML string. Use it in a framework other than
 * React, where you write raw HTML into the page yourself.
 *
 * @throws {@link ComponentEmbedError} when the tree breaks a rule of the format.
 *
 * @example
 * ```ts
 * // src/routes/[...slug]/+page.server.ts in SvelteKit
 * import { createElement as h } from 'react';
 *
 * export const load: PageServerLoad = async ({ params }) => {
 *     const page = await getGuidePage(params.slug);
 *     const title = h(TextDisplay, null, `# ${page.title}`);
 *     const preview = h(Container, { accentColor: 0xf8f6e8 }, title);
 *
 *     // +page.svelte writes it with {@html data.preview} inside <svelte:head>
 *     return { page, preview: toComponentEmbedScript(preview) };
 * };
 * ```
 */
export function toComponentEmbedScript(root: ReactElement): string {
    // eslint-disable-next-line unicorn/prefer-string-raw -- its String.raw autofix turns < back into a bare <
    const json = JSON.stringify(toComponentEmbed(root)).replaceAll('<', '\\u003c');
    return `<script id="discord:component-embed" type="application/json">${json}</script>`;
}
