import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { ValeStyle } from '#src/ValeStyle';

import type { TSESTree } from '@typescript-eslint/utils';

// the same exception .vale.ini makes for code comments
const style = ValeStyle.load().without('Semicolon');

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

        // text is the raw source between the delimiters, so a match index is also a source offset
        function check(chunk: TSESTree.Node, text: string, whole: TSESTree.Node): void {
            if (!wanted(whole) || !isProse(text) || ignored(whole)) return;
            for (const { rule, message, index, length } of style.matches(blankCode(text))) {
                // + 1 skips the opening quote, or the backtick or } in front of a template chunk
                const start = chunk.range[0] + 1 + index;
                context.report({
                    node: chunk,
                    loc: {
                        start: context.sourceCode.getLocFromIndex(start),
                        end: context.sourceCode.getLocFromIndex(start + length)
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
