import type { LanguageRegistration } from 'shiki';

const PATH = String.raw`[A-Za-z_@.][\w./@-]*`;

// the text between mustaches can be any language, so this colors only the mustaches
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
