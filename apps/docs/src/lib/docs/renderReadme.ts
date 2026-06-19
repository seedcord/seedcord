import { Marked } from 'marked';

import { sanitizeHtml } from '@lib/sanitizeHtml';

// Isolated instance so README rendering stays deterministic and independent of the
// shiki-configured global `marked` used for TSDoc prose (renderParagraphs.ts).
const readmeMarked = new Marked({ async: true, gfm: true });

export async function renderReadme(markdown: string): Promise<string> {
    const html = await readmeMarked.parse(markdown);
    // the first README image is the hero banner and the page's LCP element, so fetch it at high priority.
    const prioritized = html.replace(/<img\b/, '<img fetchpriority="high"');
    return sanitizeHtml(prioritized);
}
