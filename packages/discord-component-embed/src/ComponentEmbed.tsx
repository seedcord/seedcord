import { toComponentEmbed } from './toComponentEmbed';

import type { ReactElement } from 'react';

export interface ComponentEmbedProps {
    /** The `<Container>` to show in place of the Open Graph card. */
    children: ReactElement;
}

/**
 * Renders the `<script>` tag Discord reads for a component embed. Discord does not run JavaScript, so render this on
 * the server. Discord's docs say to put it in the page, typically in the `<head>`.
 *
 * @example
 * ```tsx
 * // app/[...slug]/page.tsx in Next.js
 * export default async function GuidePage({ params }: PageProps<'/[...slug]'>) {
 *     const page = await getGuidePage((await params).slug);
 *
 *     // only Discord's crawler reads the <ComponentEmbed> tag
 *     return (
 *         <>
 *             <ComponentEmbed>
 *                 <GuidePreview page={page} />
 *             </ComponentEmbed>
 *             <article>{page.body}</article>
 *         </>
 *     );
 * }
 * ```
 */
export function ComponentEmbed({ children }: ComponentEmbedProps): ReactElement {
    // react 19 escapes <script and </script inside a script's text
    return (
        <script id="discord:component-embed" type="application/json">
            {JSON.stringify(toComponentEmbed(children))}
        </script>
    );
}
