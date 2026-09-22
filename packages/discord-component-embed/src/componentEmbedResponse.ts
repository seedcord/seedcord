import { toComponentEmbedJson } from './toComponentEmbedJson';

import type { EmbedElement } from './element';

/**
 * Builds the `Response` for a URL that a `<link rel="discord:component-embed">` tag points at. Return it from that
 * route.
 *
 * @throws a {@link ComponentEmbedError} when the tree breaks a rule of the format, or when your own code throws while
 * the package reads it.
 *
 * @example
 * ```tsx
 * // app/embeds/[...slug]/route.tsx in Next.js, linked from
 * // <link rel="discord:component-embed" type="application/json" href="https://guide.seedcord.org/embeds/components/custom-ids" />
 * export async function GET(_request: Request, { params }: RouteContext<'/embeds/[...slug]'>) {
 *     const page = await getGuidePage((await params).slug);
 *     return componentEmbedResponse(<GuidePreview page={page} />);
 * }
 * ```
 */
export function componentEmbedResponse(root: EmbedElement): Response {
    return new Response(toComponentEmbedJson(root), { headers: { 'content-type': 'application/json' } });
}
