import { ComponentEmbedError } from './ComponentEmbedError';
import { toComponentEmbed } from './toComponentEmbed';

import type { ReactElement } from 'react';

// discord measures this on the raw response bytes
const MAX_LINKED_BYTES = 3000;

/**
 * Builds the `Response` for a URL that a `<link rel="discord:component-embed">` tag points at.
 *
 * @throws {@link ComponentEmbedError} when the JSON is over Discord's 3000-byte limit for linked payloads, or when the
 * tree breaks a rule of the format.
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
export function componentEmbedResponse(root: ReactElement): Response {
    const body = new TextEncoder().encode(JSON.stringify(toComponentEmbed(root)));

    if (body.byteLength > MAX_LINKED_BYTES) {
        throw new ComponentEmbedError(
            'OverLimit',
            `Linked component embed JSON is limited to ${String(MAX_LINKED_BYTES)} bytes, this one is ${String(body.byteLength)}.`
        );
    }

    return new Response(body, { headers: { 'content-type': 'application/json' } });
}
