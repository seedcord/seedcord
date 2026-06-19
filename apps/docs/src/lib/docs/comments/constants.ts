export const HTML_ESCAPE_PATTERN = /[&<>"']/g;
export const DEFAULT_INLINE_LANG = 'ts';

export const HTML_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};
export const FENCE_PREFIX_LENGTH = 3;
export const FENCE_SUFFIX = '\n```';
