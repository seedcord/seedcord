import { scriptSafeJson } from './scriptSafeJson';
import { buildEmbed } from './toComponentEmbed';

import type { EmbedElement } from './element';

/**
 * Returns the component embed's JSON as a string. It escapes `</` and `<!--` to keep text in the card from closing
 * the `<script>` tag early. Use it when your framework writes the tag itself and takes the JSON as its content.
 *
 * @throws a {@link ComponentEmbedError} when the tree breaks a rule of the format, or when your own code throws while
 * the package reads it.
 *
 * @example
 * ```tsx
 * // a SolidStart route. the script needs the id discord:component-embed
 * <script id="discord:component-embed" type="application/json" innerHTML={toComponentEmbedJson(buildPostCard(post))} />
 * ```
 */
export function toComponentEmbedJson(root: EmbedElement): string {
    return buildEmbed(root, scriptSafeJson).json;
}
