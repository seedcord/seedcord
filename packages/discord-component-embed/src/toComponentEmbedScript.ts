import { SCRIPT_ID, toScriptJson } from './scriptJson';

import type { EmbedElement } from './element';

/**
 * Returns the `<script>` tag Discord reads for a component embed, as an HTML string. Use it in a framework other than
 * React, where you write raw HTML into the page yourself.
 *
 * @throws {@link ComponentEmbedError} when the tree breaks a rule of the format.
 *
 * @example
 * ```ts
 * // src/routes/[...slug]/+page.server.ts in SvelteKit
 * export const load: PageServerLoad = async ({ params }) => {
 *     const page = await getGuidePage(params.slug);
 *     const title = h(TextDisplay, null, `# ${page.title}`);
 *     const preview = h(Container, { accentColor: 0xf8f6e8 }, title);
 *
 *     // in +page.svelte, output it with {@html data.preview} inside <svelte:head>
 *     return { page, preview: toComponentEmbedScript(preview) };
 * };
 * ```
 */
export function toComponentEmbedScript(root: EmbedElement): string {
    return `<script id="${SCRIPT_ID}" type="application/json">${toScriptJson(root)}</script>`;
}
