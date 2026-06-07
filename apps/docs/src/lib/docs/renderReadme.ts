import { Marked } from 'marked';

import { sanitizeHtml } from '@lib/sanitizeHtml';

// Isolated instance so README rendering stays deterministic and independent of the
// shiki-configured global `marked` used for TSDoc prose (renderParagraphs.ts).
const readmeMarked = new Marked({ async: true, gfm: true });

export async function renderReadme(markdown: string): Promise<string> {
    const html = await readmeMarked.parse(markdown);
    return sanitizeHtml(html);
}
