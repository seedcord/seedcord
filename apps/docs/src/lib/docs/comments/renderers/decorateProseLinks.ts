import { opensInNewTab } from '@lib/docs/crossPackage';

// marked's default renderer emits `<a href="...">` with href first and no class or target.
// this must run before sanitize. otherwise DOMPurify strips the target/rel/class it adds.
const ANCHOR_OPEN = /<a\s+href="([^"]*)"([^>]*)>/g;

export function decorateProseLinks(html: string, currentPackage: string): string {
    return html.replace(ANCHOR_OPEN, (match, href: string, rest: string) => {
        if (!opensInNewTab(href, currentPackage)) return match;
        if (/\b(?:class|target)=/.test(rest)) return match;
        return `<a href="${href}"${rest} target="_blank" rel="noopener noreferrer" class="cross-ref">`;
    });
}
