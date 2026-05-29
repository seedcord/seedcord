import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
        ADD_ATTR: ['target']
    });
}
