import { opensInNewTab } from '@lib/docs/crossPackage';

// Targets the bare `<a href="...">` shape marked's default renderer emits (href first, no class/target).
// Must run before sanitize so DOMPurify keeps the target/rel/class this adds.
const ANCHOR_OPEN = /<a\s+href="([^"]*)"([^>]*)>/g;

export function decorateProseLinks(html: string, currentPackage: string): string {
    return html.replace(ANCHOR_OPEN, (match, href: string, rest: string) => {
        if (!opensInNewTab(href, currentPackage)) return match;
        // So the rewrite does not emit duplicate attributes.
        if (/\b(?:class|target)=/.test(rest)) return match;
        return `<a href="${href}"${rest} target="_blank" rel="noopener noreferrer" class="cross-ref">`;
    });
}
