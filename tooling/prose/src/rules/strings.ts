import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { ValeStyle } from '#src/ValeStyle';

import type { TSESTree } from '@typescript-eslint/utils';

// strings get the Semicolon exception that comments have. CauseFirst only covers comments
const style = ValeStyle.load().without('Semicolon', 'CauseFirst');

const PLAIN_WORD = /^[A-Za-z][A-Za-z']*[.,!?:]?$/;
// under three words is an identifier, a path, or a key
const MIN_WORDS = 3;
// a class list like 'size-8 shrink-0' isn't made of plain words
const MIN_PLAIN_WORDS = 2;
const IGNORE_NEXT_LINE = /\/\/\s*prose-ignore-next-line\b/;
const CODE_SPAN = /`[^`\n]*`/g;
const TEST_CALLS = new Set(['describe', 'it', 'test', 'suite']);

function isProse(text: string): boolean {
    const words = text.split(/\s+/).filter(Boolean);
    return words.length >= MIN_WORDS && words.filter((word) => PLAIN_WORD.test(word)).length >= MIN_PLAIN_WORDS;
}

const blankCode = (text: string): string => text.replaceAll(CODE_SPAN, (span) => ' '.repeat(span.length));

const ESCAPE = /\\(?:u\{[\da-fA-F]+\}|u[\da-fA-F]{4}|x[\da-fA-F]{2}|\r\n|[\s\S])/g;
const LINE_CONTINUATION = /^(?:\r\n|[\n\r\p{Zl}\p{Zp}])$/u;
const CONTROL_ESCAPES: Record<string, string> = { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', 0: '\0' };

function unescape(body: string): string {
    if (LINE_CONTINUATION.test(body)) return '';
    if (body.length > 1) return String.fromCodePoint(Number.parseInt(body.replaceAll(/[ux{}]/g, ''), 16));
    return CONTROL_ESCAPES[body] ?? body;
}

// what the string holds at runtime, and the source offset of each character
function decode(raw: string): { text: string; sourceOffset: (index: number) => number } {
    let text = '';
    const offsets: number[] = [];
    let at = 0;
    const copyUpTo = (end: number): void => {
        text += raw.slice(at, end);
        for (; at < end; at++) offsets.push(at);
    };
    for (const match of raw.matchAll(ESCAPE)) {
        copyUpTo(match.index);
        const value = unescape(match[0].slice(1));
        text += value;
        offsets.push(...new Array<number>(value.length).fill(at));
        at += match[0].length;
    }
    copyUpTo(raw.length);
    // the index just past the last character maps to the end of the source
    return { text, sourceOffset: (index) => offsets[index] ?? raw.length };
}

// `it.each(rows)('name')` and `describe.skip('name')` both root at the test call's identifier
function calleeRoot(callee: TSESTree.Node): string | undefined {
    let current = callee;
    while (current.type === AST_NODE_TYPES.MemberExpression || current.type === AST_NODE_TYPES.CallExpression) {
        current = current.type === AST_NODE_TYPES.MemberExpression ? current.object : current.callee;
    }
    return current.type === AST_NODE_TYPES.Identifier ? current.name : undefined;
}

function isTestName(node: TSESTree.Node): boolean {
    const { parent } = node;
    return (
        parent?.type === AST_NODE_TYPES.CallExpression &&
        parent.arguments[0] === node &&
        TEST_CALLS.has(calleeRoot(parent.callee) ?? '')
    );
}

interface Options {
    only?: 'test-names';
}

export const strings = ESLintUtils.RuleCreator.withoutDocs<[Options], 'prose'>({
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Apply the repo prose rules to string literals, where error messages and CLI output live.'
        },
        messages: { prose: '{{rule}}: {{message}}' },
        schema: [
            {
                type: 'object',
                properties: { only: { type: 'string', enum: ['test-names'] } },
                additionalProperties: false
            }
        ],
        defaultOptions: [{}]
    },
    create(context, [{ only }]) {
        const wanted = (literal: TSESTree.Node): boolean => only === undefined || isTestName(literal);

        function ignored(node: TSESTree.Node): boolean {
            const previous = context.sourceCode.lines[node.loc.start.line - 2];
            return previous !== undefined && IGNORE_NEXT_LINE.test(previous);
        }

        function check(chunk: TSESTree.Node, raw: string, whole: TSESTree.Node): void {
            const { text, sourceOffset } = decode(raw);
            if (!wanted(whole) || !isProse(text) || ignored(whole)) return;
            // + 1 skips the opening quote, or the backtick or } in front of a template chunk
            const contentStart = chunk.range[0] + 1;
            for (const { rule, message, index, length } of style.matches(blankCode(text))) {
                context.report({
                    node: chunk,
                    loc: {
                        start: context.sourceCode.getLocFromIndex(contentStart + sourceOffset(index)),
                        end: context.sourceCode.getLocFromIndex(contentStart + sourceOffset(index + length))
                    },
                    messageId: 'prose',
                    data: { rule, message }
                });
            }
        }

        return {
            Literal(node) {
                if (typeof node.value === 'string') check(node, node.raw.slice(1, -1), node);
            },
            TemplateElement(node) {
                if (node.parent.type === AST_NODE_TYPES.TemplateLiteral) check(node, node.value.raw, node.parent);
            }
        };
    }
});
