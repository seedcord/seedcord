import { readdirSync, readFileSync } from 'node:fs';

import { parse } from 'yaml';

interface ValeRule {
    extends: string;
    message: string;
    level: 'suggestion' | 'warning' | 'error';
    tokens?: string[];
    swap?: Record<string, string>;
    ignorecase?: boolean;
    nonword?: boolean;
}

interface ProsePattern {
    rule: string;
    regex: RegExp;
    message: (match: string) => string;
}

const STYLE = new URL('../vale/Seedcord/', import.meta.url);

// vale wraps tokens in word boundaries unless the rule sets nonword
function compile(tokens: readonly string[], { ignorecase, nonword }: ValeRule): RegExp {
    const alternation = tokens.map((token) => `(?:${token})`).join('|');
    return new RegExp(nonword ? alternation : String.raw`\b(?:${alternation})\b`, ignorecase ? 'gi' : 'g');
}

// a substitution message takes the replacement first, then the match
function patternsOf(name: string, rule: ValeRule): ProsePattern[] {
    if (rule.extends === 'existence') {
        return [
            {
                rule: name,
                regex: compile(rule.tokens ?? [], rule),
                message: (match) => rule.message.replace('%s', match)
            }
        ];
    }
    if (rule.extends === 'substitution') {
        return Object.entries(rule.swap ?? {}).map(([token, replacement]) => ({
            rule: name,
            regex: compile([token], rule),
            message: (match) => rule.message.replace('%s', replacement).replace('%s', match)
        }));
    }
    return [];
}

export class ValeStyle {
    private constructor(private readonly patterns: readonly ProsePattern[]) {}

    static load(folder: URL = STYLE): ValeStyle {
        const patterns = readdirSync(folder)
            .filter((file) => file.endsWith('.yml'))
            .flatMap((file) => {
                const rule = parse(readFileSync(new URL(file, folder), 'utf8')) as ValeRule;
                return rule.level === 'error' ? patternsOf(file.slice(0, -'.yml'.length), rule) : [];
            });
        return new ValeStyle(patterns);
    }

    without(...rules: string[]): ValeStyle {
        return new ValeStyle(this.patterns.filter(({ rule }) => !rules.includes(rule)));
    }

    *matches(text: string): Generator<{ rule: string; message: string; index: number; length: number }> {
        for (const { rule, regex, message } of this.patterns) {
            for (const match of text.matchAll(regex)) {
                yield { rule, message: message(match[0]), index: match.index, length: match[0].length };
            }
        }
    }
}
