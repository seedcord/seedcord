export const MARKDOWN = 'text/markdown';
const HTML = 'text/html';

// RFC 9110 reads an absent q as 1. q=0 rejects the type outright
// a wildcard range scores 0 here. only an exact media type counts
function quality(accept: string, type: string): number {
    for (const range of accept.split(',')) {
        const [media, ...params] = range.split(';').map((part) => part.trim());
        if (media !== type) continue;

        const q = params.find((param) => param.startsWith('q='));
        return q === undefined ? 1 : Number(q.slice(2));
    }

    return 0;
}

// a browser ranks text/html at least as high as anything else it accepts
export function wantsMarkdown(request: Request): boolean {
    const accept = request.headers.get('accept') ?? '';
    const markdown = quality(accept, MARKDOWN);
    return markdown > 0 && markdown > quality(accept, HTML);
}
