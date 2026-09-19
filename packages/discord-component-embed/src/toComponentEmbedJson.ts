import { toComponentEmbed } from './toComponentEmbed';

import type { EmbedElement } from './element';

/**
 * Returns the component embed's JSON as a string, with every `<` escaped so text in the card can't close the
 * `<script>` tag early. Use it when your framework writes the tag itself and takes the JSON as its content.
 *
 * @throws a {@link ComponentEmbedError} when the tree breaks a rule of the format, or when your own code throws while
 * the tree is read.
 *
 * @example
 * ```tsx
 * // a SolidStart route. the script needs the id discord:component-embed
 * <script id="discord:component-embed" type="application/json" innerHTML={toComponentEmbedJson(buildPostCard(post))} />
 * ```
 */
export function toComponentEmbedJson(root: EmbedElement): string {
    // eslint-disable-next-line unicorn/prefer-string-raw -- its String.raw autofix turns \\u003c into a bare < over two lint:fix runs
    return JSON.stringify(toComponentEmbed(root)).replaceAll('<', '\\u003c');
}
