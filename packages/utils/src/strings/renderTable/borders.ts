import type { BorderStyle } from './options';

export interface LinePart {
    left: string;
    mid: string;
    right: string;
    fill: string;
}

export interface BorderChars {
    top: LinePart;
    bottom: LinePart;
    sep: LinePart;
    headerSep: LinePart;
    vertical: string;
}

const DOUBLE: BorderChars = {
    top: { left: '╔', mid: '╦', right: '╗', fill: '═' },
    bottom: { left: '╚', mid: '╩', right: '╝', fill: '═' },
    sep: { left: '╟', mid: '╫', right: '╢', fill: '─' },
    headerSep: { left: '╠', mid: '╬', right: '╣', fill: '═' },
    vertical: '║'
};

const ROUNDED: BorderChars = {
    top: { left: '╭', mid: '┬', right: '╮', fill: '─' },
    bottom: { left: '╰', mid: '┴', right: '╯', fill: '─' },
    sep: { left: '├', mid: '┼', right: '┤', fill: '─' },
    headerSep: { left: '├', mid: '┼', right: '┤', fill: '─' },
    vertical: '│'
};

const ASCII: BorderChars = {
    top: { left: '+', mid: '+', right: '+', fill: '-' },
    bottom: { left: '+', mid: '+', right: '+', fill: '-' },
    sep: { left: '+', mid: '+', right: '+', fill: '-' },
    headerSep: { left: '+', mid: '+', right: '+', fill: '-' },
    vertical: '|'
};

export const BORDERS: Record<Exclude<BorderStyle, 'markdown'>, BorderChars> = {
    double: DOUBLE,
    rounded: ROUNDED,
    ascii: ASCII
};
