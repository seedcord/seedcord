import {
    HTML_ESCAPE_PATTERN,
    HTML_ESCAPE_MAP,
    ATTRIBUTE_ESCAPE_PATTERN,
    INLINE_CODE_TRIM,
    INTERNAL_DOC_PATH
} from './constants';

export function escapeHtml(value: string): string {
    return value.replace(HTML_ESCAPE_PATTERN, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

export function escapeAttribute(value: string): string {
    return value.replace(ATTRIBUTE_ESCAPE_PATTERN, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

export function normalizeInlineCode(value: string): string {
    return value.replace(INLINE_CODE_TRIM, '').trim();
}

export function sanitizeInternalHref(href: string): string {
    try {
        if (INTERNAL_DOC_PATH.test(href)) {
            return decodeURI(href);
        }
    } catch {
        return href;
    }
    return href;
}
