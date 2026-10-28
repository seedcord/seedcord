import type { LanguageRegistration } from 'shiki';

const PATH = String.raw`[A-Za-z_@.][\w./@-]*`;

// a .hbs template only becomes code once it renders, so only the mustaches get colors
export const langHandlebars: LanguageRegistration = {
    name: 'hbs',
    scopeName: 'text.hbs',
    patterns: [
        {
            begin: String.raw`\{\{~?([#/][\w-]*|>)?`,
            end: String.raw`~?\}\}`,
            name: 'meta.mustache.hbs',
            beginCaptures: { 1: { name: 'keyword.control.hbs' } },
            patterns: [
                { match: '"[^"]*"|\'[^\']*\'', name: 'string.quoted.hbs' },
                {
                    match: String.raw`(?:\G\s*|\(\s*)(${PATH})(?=\s+[^\s}~)])`,
                    captures: { 1: { name: 'entity.name.function.hbs' } }
                },
                { match: PATH, name: 'variable.other.hbs' }
            ]
        }
    ],
    repository: {}
};
