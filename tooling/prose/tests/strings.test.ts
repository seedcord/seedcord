import { RuleTester } from '@typescript-eslint/rule-tester';
import dedent from 'dedent';
import { afterAll, describe, it } from 'vite-plus/test';

import { stringHints, strings } from '#src/rules/strings';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

new RuleTester().run('strings', strings, {
    valid: [
        "throw new Error('The config file is missing a token. Add BOT_TOKEN to your .env.');",
        "const key = 'robust';",
        // code spans are skipped
        "const hint = 'Pass `leverage` as the second argument.';",
        // string-hints reports the suggestion-level patterns
        "const note = 'The handler sees the route id in its custom id.';",
        'const line = `${name} was registered in ${file}`;',
        "const cls = cn('drop-shadow-mark size-8 shrink-0');",
        // a compound and the noun are allowed
        "const note = 'Precedence is last-wins, which is a quick win for readers.';",
        dedent`
            // prose-ignore-next-line -- Discord's own wording, quoted
            const quoted = 'Interaction has already been acknowledged, rather than replied.';
        `,
        // the marker covers a template's later lines too
        [
            '// prose-ignore-next-line -- quoted across lines',
            'const spread = `Interaction has already',
            'been acknowledged ${state}, rather than replied.`;'
        ].join('\n')
    ],
    invalid: [
        {
            code: "const note = 'The call does nothing outside seedcord dev.';",
            errors: [{ messageId: 'prose', column: 24, endColumn: 36 }]
        },
        {
            code: "throw new Error('The job stays untouched after a restart.');",
            errors: [{ messageId: 'prose', column: 26, endColumn: 31 }]
        },
        {
            // the escape takes two source characters and decodes to one
            code: String.raw`const note = 'Don\'t panic, the job stays untouched.';`,
            errors: [{ messageId: 'prose', column: 37, endColumn: 42 }]
        },
        {
            // the word after an escaped newline is a word of its own
            code: String.raw`const note = 'The job\nstays untouched.';`,
            errors: [{ messageId: 'prose', column: 24, endColumn: 29 }]
        },
        {
            code: 'const message = `Pass ${name} rather than a string, since the codec reads it`;',
            errors: [{ messageId: 'prose', column: 31, endColumn: 42 }]
        },
        {
            code: "const help = 'This seamlessly reloads the handler — no restart needed.';",
            errors: [
                { messageId: 'prose', column: 20, endColumn: 30 },
                { messageId: 'prose', column: 51, endColumn: 52 }
            ]
        },
        {
            code: "const note = 'A later file wins over an earlier one.';",
            errors: [{ messageId: 'prose', column: 28, endColumn: 32 }]
        },
        {
            code: "const hint = 'Return nothing to use the default.';",
            errors: [{ messageId: 'prose', column: 15, endColumn: 29 }]
        },
        {
            code: "const hint = 'Restart the bot in order to reload the config.';",
            errors: [
                {
                    messageId: 'prose',
                    data: { rule: 'Swap', message: "Write 'to' in place of 'in order to'." },
                    column: 31,
                    endColumn: 42
                }
            ]
        }
    ]
});

new RuleTester().run('strings in test names', strings, {
    valid: [
        {
            code: "it('throws when the token is missing', () => { parse('the job stays untouched after a restart'); });",
            options: [{ only: 'test-names' }]
        }
    ],
    invalid: [
        {
            code: "describe('the record stays untouched', () => {});",
            options: [{ only: 'test-names' }],
            errors: [{ messageId: 'prose', column: 22, endColumn: 27 }]
        },
        {
            code: "it.each([1, 2])('the value stays put for %i', () => {});",
            options: [{ only: 'test-names' }],
            errors: [{ messageId: 'prose', column: 28, endColumn: 33 }]
        },
        {
            code: 'test.skip(`the cache goes away after ${n} reads`, () => {});',
            options: [{ only: 'test-names' }],
            errors: [{ messageId: 'prose', column: 22, endColumn: 26 }]
        }
    ]
});

new RuleTester().run('string-hints', stringHints, {
    // an error-level match belongs to the strings rule
    valid: ["throw new Error('The job stays untouched after a restart.');"],
    invalid: [
        {
            code: "it('skips the put when no scope is given', () => {});",
            options: [{ only: 'test-names' }],
            // the span covers 'when no scope'
            errors: [{ messageId: 'prose', column: 19, endColumn: 32 }]
        },
        {
            code: String.raw`it('calls a helper that doesn\'t exist', () => {});`,
            options: [{ only: 'test-names' }],
            // the span covers "that doesn't exist"
            errors: [{ messageId: 'prose', column: 20, endColumn: 39 }]
        }
    ]
});
