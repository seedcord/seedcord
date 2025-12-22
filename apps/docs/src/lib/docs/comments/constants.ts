export const DOUBLE_NEWLINE = /\n{2,}/;
export const HTML_ESCAPE_PATTERN = /[&<>"']/g;
export const ATTRIBUTE_ESCAPE_PATTERN = /[&<>"']/g;
export const INLINE_CODE_TRIM = /^`+|`+$/g;
export const DEFAULT_INLINE_LANG = 'ts';
export const INTERNAL_DOC_PATH = /^\/?docs\//;

export const HTML_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};
export const FENCE_PREFIX_LENGTH = 3;
export const FENCE_SUFFIX = '\n```';
export const SPACE = ' ';
